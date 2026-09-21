import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FolioService } from '../folio/folio.service';
import { CreateShortStayDto, ShortStayQueryDto, CheckOutShortStayDto } from './dto/short-stay.dto';

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

  // Rooms eligible for a new short stay: any AVAILABLE room, unless the
  // property has flagged specific categories as short-stay eligible, in
  // which case only those show up.
  async getEligibleRooms(propertyId: string, tenantId: string) {
    const property = await this.prisma.property.findFirst({ where: { id: propertyId, tenantId }, select: { id: true } });
    if (!property) throw new NotFoundException('Property not found');

    const anyEligible = await this.prisma.roomCategory.findFirst({
      where: { propertyId, isShortStayEligible: true },
      select: { id: true },
    });

    return this.prisma.room.findMany({
      where: {
        propertyId,
        status: 'AVAILABLE',
        isActive: true,
        ...(anyEligible ? { category: { isShortStayEligible: true } } : {}),
      },
      include: { category: true },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });
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
    const room = await this.prisma.room.findFirst({
      where: { id: dto.roomId, property: { tenantId } },
      include: { category: true },
    });
    if (!room) throw new NotFoundException('Room not found');
    if (room.status !== 'AVAILABLE') throw new BadRequestException('Room is not available');
    const propertyId = room.propertyId;

    const anyEligible = await this.prisma.roomCategory.findFirst({
      where: { propertyId, isShortStayEligible: true },
      select: { id: true },
    });
    if (anyEligible && !room.category?.isShortStayEligible) {
      throw new BadRequestException('This room\'s category is not eligible for short stay');
    }

    if (dto.guestId) {
      const guest = await this.prisma.guest.findFirst({ where: { id: dto.guestId, tenantId }, select: { id: true } });
      if (!guest) throw new NotFoundException('Guest not found');
    }

    const checkIn = new Date();
    const checkOutPlanned = new Date(checkIn.getTime() + dto.durationHours * 60 * 60 * 1000);
    const totalAmount = dto.hourlyRate * dto.durationHours;

    const booking = await this.prisma.$transaction(async (tx) => {
      const created = await tx.shortStayBooking.create({
        data: {
          propertyId,
          roomId: dto.roomId,
          guestId: dto.guestId,
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
          guestId: dto.guestId,
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

  // Adds hours to an in-progress stay. Extends from whichever is later -
  // the currently-planned checkout or right now - so extending an overdue
  // stay doesn't silently compound stale overage into the new plan.
  async extend(id: string, additionalHours: number, tenantId: string) {
    const booking = await this.prisma.shortStayBooking.findFirst({ where: { id, property: { tenantId } } });
    if (!booking) throw new NotFoundException('Short stay booking not found');
    if (booking.status !== 'CHECKED_IN') throw new BadRequestException('Only a checked-in booking can be extended');

    const base = Math.max(booking.checkOutPlanned.getTime(), Date.now());
    const checkOutPlanned = new Date(base + additionalHours * 60 * 60 * 1000);
    const additionalAmount = additionalHours * Number(booking.hourlyRate);

    return this.prisma.shortStayBooking.update({
      where: { id },
      data: {
        durationHours: booking.durationHours + additionalHours,
        checkOutPlanned,
        totalAmount: Number(booking.totalAmount) + additionalAmount,
      },
    });
  }

  async checkOut(id: string, dto: CheckOutShortStayDto, tenantId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
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

      // Auto-earn loyalty points on checkout, same rule as Reservation checkout -
      // only when a real guest is actually linked (usually isn't, for short stay).
      if (booking.guestId) {
        const [loyaltyAccount, stayRule] = await Promise.all([
          tx.loyaltyAccount.findFirst({ where: { guestId: booking.guestId } }),
          tx.loyaltyRule.findFirst({ where: { type: 'STAY', isActive: true } }),
        ]);

        if (loyaltyAccount && stayRule && totalAmount > 0) {
          const pointsEarned = Math.floor(totalAmount * Number(stayRule.multiplier ?? 1)) + stayRule.pointsValue;
          if (pointsEarned > 0) {
            await tx.loyaltyAccount.update({
              where: { id: loyaltyAccount.id },
              data: { points: { increment: pointsEarned }, lifetimePoints: { increment: pointsEarned } },
            });
            await tx.loyaltyTransaction.create({
              data: {
                loyaltyAccountId: loyaltyAccount.id,
                type: 'EARN',
                points: pointsEarned,
                description: `Short stay reward — ${booking.id.slice(0, 8).toUpperCase()}`,
                referenceId: booking.id,
                referenceType: 'SHORT_STAY',
              },
            });
          }
        }

        await tx.guest.update({
          where: { id: booking.guestId },
          data: { totalStays: { increment: 1 }, totalSpent: { increment: totalAmount } },
        });
      }

      return updated;
    });

    let receiptNumber: string | undefined;
    if (dto.paymentAmount && dto.paymentAmount > 0) {
      receiptNumber = await this.folioService.generateReceiptNumber();
      const payment = await this.prisma.payment.create({
        data: {
          tenantId,
          shortStayBookingId: result.id,
          guestId: result.guestId,
          amount: dto.paymentAmount,
          method: (dto.paymentMethod ?? 'CASH') as any,
          status: 'COMPLETED',
          receiptNumber,
          processedAt: new Date(),
        },
      });
      await this.folioService.createPaymentJournalEntry(payment, result.propertyId, tenantId).catch(() => null);
    }

    return { booking: result, receiptNumber };
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

  // Finds or creates the guest behind this short stay (by phone, mirroring
  // Inquiries' convert flow) and returns the New Reservation seed values.
  // The room stays OCCUPIED throughout - this isn't a checkout, the guest
  // is just moving from an hourly booking onto a nightly one in the same room.
  async prepareUpgrade(id: string, tenantId: string) {
    const booking = await this.prisma.shortStayBooking.findFirst({ where: { id, property: { tenantId } } });
    if (!booking) throw new NotFoundException('Short stay booking not found');
    if (booking.status !== 'CHECKED_IN') throw new BadRequestException('Only a checked-in booking can be upgraded');

    let guestId = booking.guestId ?? undefined;
    if (!guestId && booking.guestPhone) {
      let guest = await this.prisma.guest.findFirst({ where: { tenantId, phone: booking.guestPhone, isDeleted: false } });
      if (!guest) {
        const name = (booking.guestName || 'Walk-in Guest').trim();
        const [firstName, ...lastParts] = name.split(/\s+/);
        guest = await this.prisma.guest.create({
          data: {
            tenantId,
            firstName: firstName || name,
            lastName: lastParts.join(' ') || '-',
            phone: booking.guestPhone,
          },
        });
      }
      guestId = guest.id;
    }

    const checkOut = new Date(booking.checkIn.getTime() + 24 * 60 * 60 * 1000);

    return {
      guestId,
      propertyId: booking.propertyId,
      roomId: booking.roomId,
      checkIn: booking.checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      adults: 1,
    };
  }

  async markUpgraded(id: string, reservationId: string, tenantId: string) {
    const booking = await this.prisma.shortStayBooking.findFirst({ where: { id, property: { tenantId } } });
    if (!booking) throw new NotFoundException('Short stay booking not found');
    if (booking.status !== 'CHECKED_IN') throw new BadRequestException('Only a checked-in booking can be upgraded');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.shortStayBooking.update({
        where: { id },
        data: { status: 'UPGRADED', upgradedReservationId: reservationId },
      });
      // The guest never left - keep the room occupied under the new reservation.
      await tx.room.update({ where: { id: booking.roomId }, data: { status: 'OCCUPIED' } });
      return updated;
    });
  }
}
