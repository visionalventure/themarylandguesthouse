import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class FolioService {
  private readonly logger = new Logger(FolioService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getFolio(reservationId: string) {
    const [reservation, charges, payments] = await Promise.all([
      this.prisma.reservation.findUnique({
        where: { id: reservationId },
        include: {
          guest: true,
          rooms: { include: { room: { include: { category: true } } } },
          property: { select: { id: true, name: true, address: true, phone: true, email: true, logoUrl: true, currency: true } },
        },
      }),
      this.prisma.reservationCharge.findMany({
        where: { reservationId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.payment.findMany({
        where: { reservationId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    if (!reservation) throw new NotFoundException('Reservation not found');

    const totalCharges  = charges.reduce((s, c) => s + Number(c.amount), 0);
    const discountAmount = Number(reservation.discountAmount ?? 0);
    const totalPaid     = payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((s, p) => s + Number(p.amount), 0);

    // Build running-balance ledger
    const ledger: any[] = [];
    let balance = 0;

    const allEntries: { type: string; date: Date; data: any }[] = [
      ...charges.map((c) => ({ type: 'CHARGE', date: c.createdAt, data: c })),
      ...payments.filter((p) => p.status === 'COMPLETED').map((p) => ({ type: 'PAYMENT', date: p.processedAt ?? p.createdAt, data: p })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Inject discount after all charges, before payments
    if (discountAmount > 0) {
      const lastCharge = charges[charges.length - 1];
      allEntries.push({
        type: 'DISCOUNT',
        date: lastCharge?.createdAt ?? reservation.createdAt,
        data: { amount: discountAmount, description: reservation.couponCode ?? 'Discount' },
      });
      allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    for (const entry of allEntries) {
      if (entry.type === 'CHARGE') {
        balance += Number(entry.data.amount);
      } else {
        balance -= Number(entry.data.amount);
      }
      ledger.push({ ...entry, runningBalance: balance });
    }

    return {
      reservation,
      charges,
      payments,
      ledger,
      totalCharges,
      discountAmount,
      totalPaid,
      balance: totalCharges - discountAmount - totalPaid,
    };
  }

  async postCharge(reservationId: string, dto: any) {
    const reservation = await this.prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) throw new NotFoundException('Reservation not found');

    const { chargeType, description, amount, quantity = 1, taxRate = 0 } = dto;
    const unitPrice = Number(amount);
    const totalAmount = unitPrice * Number(quantity) * (1 + Number(taxRate) / 100);

    return this.prisma.reservationCharge.create({
      data: {
        reservationId,
        chargeType,
        description,
        amount: totalAmount,
        unitPrice,
        quantity: Number(quantity),
        taxRate: Number(taxRate),
      },
    });
  }

  async applyDiscount(reservationId: string, dto: { discountType: 'PERCENTAGE' | 'FIXED'; value: number; reason?: string }) {
    const reservation = await this.prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) throw new NotFoundException('Reservation not found');
    if (dto.value < 0) throw new BadRequestException('Discount value cannot be negative');

    const charges = await this.prisma.reservationCharge.findMany({ where: { reservationId } });
    const totalCharges = charges.reduce((s, c) => s + Number(c.amount), 0);

    let discountAmount: number;
    if (dto.discountType === 'PERCENTAGE') {
      if (dto.value > 100) throw new BadRequestException('Percentage discount cannot exceed 100%');
      discountAmount = totalCharges * (dto.value / 100);
    } else {
      if (dto.value > totalCharges) throw new BadRequestException('Fixed discount cannot exceed total charges');
      discountAmount = dto.value;
    }

    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: { discountAmount, couponCode: dto.reason ?? null },
    });

    return { discountAmount, reason: dto.reason };
  }

  async removeDiscount(reservationId: string) {
    const reservation = await this.prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) throw new NotFoundException('Reservation not found');
    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: { discountAmount: 0, couponCode: null },
    });
    return { discountAmount: 0 };
  }

  async voidCharge(reservationId: string, chargeId: string) {
    const charge = await this.prisma.reservationCharge.findFirst({ where: { id: chargeId, reservationId } });
    if (!charge) throw new NotFoundException('Charge not found');
    return this.prisma.reservationCharge.delete({ where: { id: chargeId } });
  }

  async collectPayment(reservationId: string, dto: any, collectedById: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { property: { select: { id: true } } },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');

    const receiptNumber = await this.generateReceiptNumber();
    const payment = await this.prisma.payment.create({
      data: {
        reservationId,
        guestId: reservation.guestId,
        tenantId: dto.tenantId,
        receiptNumber,
        amount: Number(dto.amount),
        method: dto.method,
        currency: dto.currency ?? 'USD',
        status: 'COMPLETED',
        processedAt: new Date(),
        notes: dto.notes ?? null,
      },
    });

    // Auto-create accounting journal entry
    await this.createPaymentJournalEntry(payment, reservation.propertyId, dto.tenantId).catch(() => null);

    return { payment, receiptNumber };
  }

  async getReceipt(reservationId: string, paymentId: string) {
    const [reservation, payment] = await Promise.all([
      this.prisma.reservation.findUnique({
        where: { id: reservationId },
        include: {
          guest: true,
          rooms: { include: { room: true } },
          property: { select: { name: true, address: true, phone: true, email: true, logoUrl: true, currency: true } },
        },
      }),
      this.prisma.payment.findUnique({ where: { id: paymentId } }),
    ]);

    if (!reservation || !payment) throw new NotFoundException('Not found');

    const charges = await this.prisma.reservationCharge.findMany({ where: { reservationId } });
    const allPayments = await this.prisma.payment.findMany({ where: { reservationId, status: 'COMPLETED' } });

    const totalCharges = charges.reduce((s, c) => s + Number(c.amount), 0);
    const totalPaid    = allPayments.reduce((s, p) => s + Number(p.amount), 0);

    return {
      receipt: {
        receiptNumber: payment.receiptNumber,
        date: payment.processedAt ?? payment.createdAt,
        amount: Number(payment.amount),
        method: payment.method,
        notes: payment.notes,
      },
      guest: reservation.guest,
      reservation: {
        reservationNo: reservation.reservationNo,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        rooms: reservation.rooms.map((rr: any) => rr.room.roomNumber),
      },
      property: reservation.property,
      summary: {
        totalCharges,
        totalPaid,
        outstandingBalance: totalCharges - totalPaid,
      },
    };
  }

  private async generateReceiptNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.payment.count({
      where: { receiptNumber: { startsWith: `RCP-${year}-` } },
    });
    return `RCP-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  private async createPaymentJournalEntry(payment: any, propertyId: string, tenantId: string) {
    const [cashAccount, revenueAccount] = await Promise.all([
      this.prisma.account.findFirst({ where: { propertyId, code: '1000', isActive: true } }),
      this.prisma.account.findFirst({ where: { propertyId, code: '4000', isActive: true } }),
    ]);
    if (!cashAccount || !revenueAccount) {
      this.logger.warn(`Payment JE skipped for property ${propertyId}: GL accounts 1000/4000 not found. Set up Chart of Accounts to enable automatic journal entries.`);
      return;
    }

    const year = new Date().getFullYear();
    const count = await this.prisma.journalEntry.count({ where: { tenantId } });

    await this.prisma.journalEntry.create({
      data: {
        tenantId,
        entryNumber: `JE-${year}-${String(count + 1).padStart(5, '0')}`,
        status: 'POSTED',
        date: new Date(),
        description: `Payment received — Receipt ${payment.receiptNumber}`,
        reference: payment.receiptNumber,
        referenceType: 'PAYMENT',
        totalDebit: payment.amount,
        totalCredit: payment.amount,
        lines: {
          create: [
            { accountId: cashAccount.id,    type: 'DEBIT',  amount: payment.amount, description: `Cash receipt ${payment.receiptNumber}` },
            { accountId: revenueAccount.id, type: 'CREDIT', amount: payment.amount, description: `Room revenue ${payment.receiptNumber}` },
          ],
        },
      },
    });
  }
}
