import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(propertyId: string, tenantId: string, query: any = {}) {
    const { status, checkIn, checkOut, guestName, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { propertyId };
    if (status) where.status = status;
    if (checkIn) where.checkIn = { gte: new Date(checkIn) };
    if (checkOut) where.checkOut = { lte: new Date(checkOut) };
    if (guestName) {
      where.guest = {
        OR: [
          { firstName: { contains: guestName, mode: 'insensitive' } },
          { lastName: { contains: guestName, mode: 'insensitive' } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          rooms: { include: { room: { include: { category: true } } } },
          payments: { select: { amount: true, status: true, method: true } },
        },
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) };
  }

  async findOne(id: string, propertyId: string) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id, propertyId },
      include: {
        guest: true,
        rooms: { include: { room: { include: { category: true } } } },
        payments: true,
        charges: true,
        invoices: true,
      },
    });

    if (!reservation) throw new NotFoundException('Reservation not found');
    return reservation;
  }

  async create(dto: any, createdById: string) {
    const reservationNo = await this.generateReservationNo(dto.propertyId);
    const { checkIn, checkOut, propertyId, guestId, adults, children,
            source, status, totalAmount, specialRequests, notes,
            depositAmount, depositMethod, tenantId } = dto;

    const totalNights = this.calculateNights(checkIn, checkOut);

    // Extract room IDs from the nested-write shape the frontend sends
    const roomIds: string[] = dto.rooms?.create?.map((r: any) => r.roomId).filter(Boolean) ?? [];

    // Look up each room's base price from its category
    const roomRecords = roomIds.length
      ? await this.prisma.room.findMany({ where: { id: { in: roomIds } }, include: { category: true } })
      : [];

    const roomsCreate = roomRecords.map((room) => ({
      roomId: room.id,
      ratePerNight: room.category?.basePrice ?? 0,
      totalNights,
      totalAmount: Number(room.category?.basePrice ?? 0) * totalNights,
    }));

    const computedTotal = roomsCreate.reduce((sum, r) => sum + Number(r.totalAmount), 0);

    const reservation = await this.prisma.reservation.create({
      data: {
        propertyId,
        guestId,
        reservationNo,
        createdById,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        adults: Number(adults ?? 1),
        children: Number(children ?? 0),
        source: source ?? 'DIRECT',
        status: status ?? 'RESERVED',
        totalAmount: computedTotal || totalAmount || 0,
        ...(specialRequests ? { specialRequests } : {}),
        ...(notes ? { notes } : {}),
        ...(roomsCreate.length ? { rooms: { create: roomsCreate } } : {}),
      },
      include: { guest: true, rooms: true },
    });

    // If a deposit was provided, collect it immediately
    if (depositAmount && Number(depositAmount) > 0 && depositMethod) {
      const year = new Date().getFullYear();
      const count = await this.prisma.payment.count({ where: { receiptNumber: { startsWith: `RCP-${year}-` } } });
      const receiptNumber = `RCP-${year}-${String(count + 1).padStart(6, '0')}`;

      await this.prisma.payment.create({
        data: {
          reservationId: reservation.id,
          guestId,
          tenantId: tenantId ?? null,
          receiptNumber,
          amount: Number(depositAmount),
          method: depositMethod,
          currency: 'USD',
          status: 'COMPLETED',
          processedAt: new Date(),
          notes: 'Deposit collected at booking',
        },
      });
    }

    return reservation;
  }

  async update(id: string, dto: any) {
    return this.prisma.reservation.update({
      where: { id },
      data: dto,
      include: { guest: true, rooms: true },
    });
  }

  async checkIn(id: string) {
    const reservation = await this.prisma.reservation.findUnique({ where: { id } });
    if (!reservation) throw new NotFoundException();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({
        where: { id },
        data: { status: 'CHECKED_IN', checkedInAt: new Date() },
      });

      await tx.reservationRoom.updateMany({
        where: { reservationId: id },
        data: {},
      });

      for (const roomRes of (await tx.reservationRoom.findMany({ where: { reservationId: id } }))) {
        await tx.room.update({
          where: { id: roomRes.roomId },
          data: { status: 'OCCUPIED' },
        });
      }

      return updated;
    });
  }

  async checkOut(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id },
        include: { rooms: true },
      });
      if (!reservation) throw new NotFoundException();

      const updated = await tx.reservation.update({
        where: { id },
        data: { status: 'CHECKED_OUT', checkedOutAt: new Date() },
      });

      for (const roomRes of reservation.rooms) {
        await tx.room.update({
          where: { id: roomRes.roomId },
          data: { status: 'VACANT_DIRTY' },
        });

        await tx.housekeepingTask.create({
          data: {
            propertyId: reservation.propertyId,
            roomId: roomRes.roomId,
            taskType: 'CHECKOUT_CLEAN',
            status: 'PENDING',
            priority: 'HIGH',
          },
        });
      }

      if (reservation.guestId) {
        // Auto-earn loyalty points on checkout
        const [loyaltyAccount, stayRule] = await Promise.all([
          tx.loyaltyAccount.findFirst({ where: { guestId: reservation.guestId } }),
          tx.loyaltyRule.findFirst({ where: { type: 'STAY', isActive: true } }),
        ]);

        if (loyaltyAccount && stayRule && Number(reservation.totalAmount) > 0) {
          const pointsEarned = Math.floor(
            Number(reservation.totalAmount) * Number(stayRule.multiplier ?? 1),
          ) + stayRule.pointsValue;

          if (pointsEarned > 0) {
            await tx.loyaltyAccount.update({
              where: { id: loyaltyAccount.id },
              data: {
                points: { increment: pointsEarned },
                lifetimePoints: { increment: pointsEarned },
              },
            });
            await tx.loyaltyTransaction.create({
              data: {
                loyaltyAccountId: loyaltyAccount.id,
                type: 'EARN',
                points: pointsEarned,
                description: `Stay reward — ${reservation.id.slice(0, 8).toUpperCase()}`,
                referenceId: reservation.id,
                referenceType: 'RESERVATION',
              },
            });
          }
        }

        await tx.guest.update({
          where: { id: reservation.guestId },
          data: {
            totalStays: { increment: 1 },
            totalSpent: { increment: reservation.totalAmount },
          },
        });
      }

      return updated;
    });
  }

  async cancel(id: string, reason?: string) {
    return this.prisma.reservation.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
    });
  }

  async getCalendar(propertyId: string, startDate: Date, endDate: Date) {
    return this.prisma.reservation.findMany({
      where: {
        propertyId,
        status: { in: ['RESERVED', 'CONFIRMED', 'CHECKED_IN'] },
        checkIn: { lte: endDate },
        checkOut: { gte: startDate },
      },
      include: {
        guest: { select: { firstName: true, lastName: true } },
        rooms: { include: { room: { select: { roomNumber: true } } } },
      },
    });
  }

  async holdRoom(dto: { roomId: string; propertyId: string; guestId?: string; notes?: string; holdMinutes?: number }, createdById: string) {
    await this.releaseExpiredHolds();
    const holdMinutes = dto.holdMinutes ?? 60;
    const holdExpiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);
    const checkIn = new Date();
    const checkOut = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const reservationNo = await this.generateReservationNo(dto.propertyId);

    return this.prisma.reservation.create({
      data: {
        propertyId: dto.propertyId,
        guestId: dto.guestId ?? null,
        reservationNo,
        createdById,
        checkIn,
        checkOut,
        adults: 1,
        children: 0,
        source: 'WALK_IN',
        status: 'PENDING',
        totalAmount: 0,
        holdExpiresAt,
        ...(dto.notes ? { notes: dto.notes } : {}),
        rooms: { create: [{ roomId: dto.roomId, ratePerNight: 0, totalNights: 1, totalAmount: 0 }] },
      },
      include: { rooms: true },
    });
  }

  async releaseExpiredHolds() {
    await this.prisma.reservation.updateMany({
      where: { status: 'PENDING', holdExpiresAt: { lte: new Date() } },
      data: { status: 'CANCELLED', cancelReason: 'Hold expired' },
    });
  }

  private async generateReservationNo(propertyId: string): Promise<string> {
    const count = await this.prisma.reservation.count({ where: { propertyId } });
    return `RES-${Date.now()}-${(count + 1).toString().padStart(4, '0')}`;
  }

  private calculateNights(checkIn: string, checkOut: string): number {
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}
