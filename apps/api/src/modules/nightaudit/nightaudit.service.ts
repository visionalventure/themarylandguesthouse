import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { startOfDay, endOfDay, addDays, format } from 'date-fns';

@Injectable()
export class NightAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async runAudit(propertyId: string, auditDateStr: string, runBy: string) {
    const auditDate = new Date(auditDateStr);
    const dayStart = startOfDay(auditDate);
    const dayEnd = endOfDay(auditDate);

    // Check if audit already closed for this date
    const existing = await this.prisma.nightAudit.findUnique({
      where: { propertyId_auditDate: { propertyId, auditDate: dayStart } },
    });
    if (existing?.status === 'CLOSED') {
      throw new BadRequestException('Audit for this date is already closed');
    }

    // Gather activity
    const [arrivals, departures, occupied, allRooms, revenueData, paymentData] = await Promise.all([
      this.prisma.reservation.count({
        where: { propertyId, checkIn: { gte: dayStart, lte: dayEnd }, status: { in: ['CHECKED_IN', 'RESERVED', 'CONFIRMED'] } },
      }),
      this.prisma.reservation.count({
        where: { propertyId, checkOut: { gte: dayStart, lte: dayEnd }, status: 'CHECKED_OUT' },
      }),
      this.prisma.room.count({ where: { propertyId, status: 'OCCUPIED' } }),
      this.prisma.room.count({ where: { propertyId, isActive: true } }),
      this.prisma.reservationCharge.aggregate({
        _sum: { amount: true },
        where: { reservation: { propertyId }, createdAt: { gte: dayStart, lte: dayEnd } },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { reservation: { propertyId }, status: 'COMPLETED', processedAt: { gte: dayStart, lte: dayEnd } },
      }),
    ]);

    // Post nightly room charges to all checked-in reservations
    const checkedInReservations = await this.prisma.reservation.findMany({
      where: { propertyId, status: 'CHECKED_IN' },
      include: { rooms: { include: { room: true } } },
    });

    const taxRateRecord = await this.prisma.taxRate.findFirst({
      where: { tenantId: propertyId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    const taxRate = taxRateRecord ? Number(taxRateRecord.rate) : 0;

    const chargesPosted: string[] = [];
    for (const res of checkedInReservations) {
      for (const rr of res.rooms) {
        const charge = await this.prisma.reservationCharge.create({
          data: {
            reservationId: res.id,
            chargeType: 'ROOM',
            description: `Room ${rr.room.roomNumber} — ${format(auditDate, 'dd MMM yyyy')}`,
            amount: rr.ratePerNight,
            unitPrice: rr.ratePerNight,
            quantity: 1,
            taxRate,
          },
        });
        chargesPosted.push(charge.id);
      }
    }

    // Mark no-shows: RESERVED/CONFIRMED past check-in date
    const noShowCount = await this.prisma.reservation.count({
      where: { propertyId, status: { in: ['RESERVED', 'CONFIRMED'] }, checkIn: { lt: dayStart } },
    });
    await this.prisma.reservation.updateMany({
      where: { propertyId, status: { in: ['RESERVED', 'CONFIRMED'] }, checkIn: { lt: dayStart } },
      data: { status: 'NO_SHOW' },
    });

    const occupancyRate = allRooms > 0 ? Math.round((occupied / allRooms) * 100) : 0;

    // Upsert audit record
    const audit = await this.prisma.nightAudit.upsert({
      where: { propertyId_auditDate: { propertyId, auditDate: dayStart } },
      create: {
        propertyId,
        auditDate: dayStart,
        status: 'IN_PROGRESS',
        totalRevenue: Number(revenueData._sum.amount ?? 0),
        totalPayments: Number(paymentData._sum.amount ?? 0),
        occupancyRate,
        roomsOccupied: occupied,
        roomsAvailable: allRooms - occupied,
        newArrivals: arrivals,
        departures,
        noShows: noShowCount,
        runBy,
      },
      update: {
        status: 'IN_PROGRESS',
        totalRevenue: Number(revenueData._sum.amount ?? 0),
        totalPayments: Number(paymentData._sum.amount ?? 0),
        occupancyRate,
        roomsOccupied: occupied,
        roomsAvailable: allRooms - occupied,
        newArrivals: arrivals,
        departures,
        noShows: noShowCount,
        runBy,
      },
    });

    return {
      audit,
      summary: {
        arrivals,
        departures,
        noShows: noShowCount,
        occupancyRate,
        roomsOccupied: occupied,
        roomsAvailable: allRooms - occupied,
        totalRevenue: Number(revenueData._sum.amount ?? 0),
        totalPayments: Number(paymentData._sum.amount ?? 0),
        nightlyChargesPosted: chargesPosted.length,
      },
    };
  }

  async previewAudit(propertyId: string, auditDateStr: string) {
    const auditDate = new Date(auditDateStr);
    const dayStart = startOfDay(auditDate);
    const dayEnd = endOfDay(auditDate);

    const [arrivals, departures, occupied, allRooms, revenueData, paymentData] = await Promise.all([
      this.prisma.reservation.count({
        where: { propertyId, checkIn: { gte: dayStart, lte: dayEnd }, status: { in: ['CHECKED_IN', 'RESERVED', 'CONFIRMED'] } },
      }),
      this.prisma.reservation.count({
        where: { propertyId, checkOut: { gte: dayStart, lte: dayEnd }, status: 'CHECKED_OUT' },
      }),
      this.prisma.room.count({ where: { propertyId, status: 'OCCUPIED' } }),
      this.prisma.room.count({ where: { propertyId, isActive: true } }),
      this.prisma.reservationCharge.aggregate({
        _sum: { amount: true },
        where: { reservation: { propertyId }, createdAt: { gte: dayStart, lte: dayEnd } },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { reservation: { propertyId }, status: 'COMPLETED', processedAt: { gte: dayStart, lte: dayEnd } },
      }),
    ]);

    // Count charges that WOULD be posted (without creating them)
    const checkedInReservations = await this.prisma.reservation.findMany({
      where: { propertyId, status: 'CHECKED_IN' },
      include: { rooms: true },
    });
    const wouldPostCharges = checkedInReservations.reduce((sum, r) => sum + r.rooms.length, 0);

    const noShowCount = await this.prisma.reservation.count({
      where: { propertyId, status: { in: ['RESERVED', 'CONFIRMED'] }, checkIn: { lt: dayStart } },
    });

    const occupancyRate = allRooms > 0 ? Math.round((occupied / allRooms) * 100) : 0;

    return {
      summary: {
        arrivals,
        departures,
        noShows: noShowCount,
        occupancyRate,
        roomsOccupied: occupied,
        roomsAvailable: allRooms - occupied,
        totalRevenue: Number(revenueData._sum.amount ?? 0),
        totalPayments: Number(paymentData._sum.amount ?? 0),
        nightlyChargesPosted: wouldPostCharges,
      },
    };
  }

  async closeAudit(id: string) {
    return this.prisma.nightAudit.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
  }

  async getHistory(propertyId: string) {
    return this.prisma.nightAudit.findMany({
      where: { propertyId },
      orderBy: { auditDate: 'desc' },
      take: 30,
    });
  }

  async getAudit(id: string) {
    return this.prisma.nightAudit.findUnique({ where: { id } });
  }
}
