import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FolioService } from '../folio/folio.service';
import { CreateShortStayDto, ShortStayQueryDto } from './dto/short-stay.dto';

@Injectable()
export class ShortStayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly folioService: FolioService,
  ) {}

  async getStats(tenantId: string, propertyId?: string) {
    const where: any = { property: { tenantId }, ...(propertyId ? { propertyId } : {}) };
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const inOneHour = new Date(Date.now() + 60 * 60 * 1000);

    const [active, todaysBookings, checkingOutSoon] = await Promise.all([
      this.prisma.shortStayBooking.count({ where: { ...where, status: 'CHECKED_IN' } }),
      this.prisma.shortStayBooking.findMany({
        where: { ...where, createdAt: { gte: startOfDay } },
        select: { totalAmount: true },
      }),
      this.prisma.shortStayBooking.count({
        where: { ...where, status: 'CHECKED_IN', checkOutPlanned: { lte: inOneHour } },
      }),
    ]);

    const todaysRevenue = todaysBookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
    return { active, todaysRevenue, checkingOutSoon };
  }

  async findAll(tenantId: string, query: ShortStayQueryDto) {
    const { propertyId, status, search, page = 1, limit = 50 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { property: { tenantId } };
    if (propertyId) where.propertyId = propertyId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { guestName: { contains: search, mode: 'insensitive' } },
        { guestPhone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.shortStayBooking.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { checkIn: 'desc' },
        include: {
          room: { select: { roomNumber: true } },
          payments: { select: { amount: true } },
        },
      }),
      this.prisma.shortStayBooking.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(id: string, tenantId: string) {
    const booking = await this.prisma.shortStayBooking.findFirst({
      where: { id, property: { tenantId } },
      include: { room: { select: { roomNumber: true } }, payments: true },
    });
    if (!booking) throw new NotFoundException('Short stay booking not found');
    return booking;
  }

  async create(dto: CreateShortStayDto, tenantId: string, createdById: string) {
    // propertyId is derived from the room itself (tenant-scoped lookup),
    // rather than trusted from the client, matching this codebase's
    // tenant-isolation convention.
    const room = await this.prisma.room.findFirst({ where: { id: dto.roomId, property: { tenantId } } });
    if (!room) throw new NotFoundException('Room not found');
    if (room.status !== 'AVAILABLE') throw new BadRequestException('Room is not available');
    const propertyId = room.propertyId;

    const checkIn = new Date();
    const checkOutPlanned = new Date(checkIn.getTime() + dto.durationHours * 60 * 60 * 1000);
    const totalAmount = dto.hourlyRate * dto.durationHours;

    const booking = await this.prisma.$transaction(async (tx) => {
      const created = await tx.shortStayBooking.create({
        data: {
          propertyId,
          roomId: dto.roomId,
          guestName: dto.guestName,
          guestPhone: dto.guestPhone,
          checkIn,
          checkOutPlanned,
          durationHours: dto.durationHours,
          hourlyRate: dto.hourlyRate,
          totalAmount,
          notes: dto.notes,
          createdById,
        },
      });
      await tx.room.update({ where: { id: dto.roomId }, data: { status: 'OCCUPIED' } });
      return created;
    });

    let receiptNumber: string | undefined;
    if (dto.depositAmount && dto.depositAmount > 0) {
      receiptNumber = await this.folioService.generateReceiptNumber();
      const payment = await this.prisma.payment.create({
        data: {
          tenantId,
          shortStayBookingId: booking.id,
          amount: dto.depositAmount,
          method: (dto.depositMethod ?? 'CASH') as any,
          status: 'COMPLETED',
          receiptNumber,
          processedAt: new Date(),
        },
      });
      await this.folioService.createPaymentJournalEntry(payment, propertyId, tenantId).catch(() => null);
    }

    return { booking, receiptNumber };
  }

  async checkOut(id: string, tenantId: string) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.shortStayBooking.findFirst({ where: { id, property: { tenantId } } });
      if (!booking) throw new NotFoundException('Short stay booking not found');
      if (booking.status !== 'CHECKED_IN') throw new BadRequestException('Booking is not checked in');

      const checkOutActual = new Date();
      let totalAmount = Number(booking.totalAmount);
      if (checkOutActual > booking.checkOutPlanned) {
        const overageMs = checkOutActual.getTime() - booking.checkOutPlanned.getTime();
        const overageHours = Math.ceil(overageMs / (60 * 60 * 1000));
        totalAmount += overageHours * Number(booking.hourlyRate);
      }

      const updated = await tx.shortStayBooking.update({
        where: { id },
        data: { status: 'CHECKED_OUT', checkOutActual, totalAmount },
      });

      await tx.room.update({ where: { id: booking.roomId }, data: { status: 'VACANT_DIRTY' } });
      await tx.housekeepingTask.create({
        data: {
          propertyId: booking.propertyId,
          roomId: booking.roomId,
          taskType: 'CHECKOUT_CLEAN',
          status: 'PENDING',
          priority: 'HIGH',
        },
      });

      return updated;
    });
  }

  async cancel(id: string, tenantId: string) {
    const booking = await this.prisma.shortStayBooking.findFirst({ where: { id, property: { tenantId } } });
    if (!booking) throw new NotFoundException('Short stay booking not found');
    if (booking.status !== 'CHECKED_IN') throw new BadRequestException('Only a checked-in booking can be cancelled');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.shortStayBooking.update({ where: { id }, data: { status: 'CANCELLED' } });
      await tx.room.update({ where: { id: booking.roomId }, data: { status: 'AVAILABLE' } });
      return updated;
    });
  }
}
