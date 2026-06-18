import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private dateRange(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();
    return { gte: start, lte: end };
  }

  async getOccupancyReport(propertyId: string, params: any = {}) {
    const range = this.dateRange(params.startDate, params.endDate);
    const totalRooms = await this.prisma.room.count({ where: { propertyId } });

    const reservations = await this.prisma.reservation.findMany({
      where: {
        propertyId,
        status: { in: ['CHECKED_IN', 'CHECKED_OUT', 'CONFIRMED'] },
        checkIn: { lte: range.lte },
        checkOut: { gte: range.gte },
      },
      select: { checkIn: true, checkOut: true, rooms: { select: { roomId: true } } },
    });

    const byCategory = await this.prisma.room.groupBy({
      by: ['categoryId'],
      where: { propertyId },
      _count: { id: true },
    });

    return { totalRooms, reservations: reservations.length, byCategory };
  }

  async getRevenueReport(propertyId: string, params: any = {}) {
    const range = this.dateRange(params.startDate, params.endDate);

    const [bySource, daily] = await Promise.all([
      this.prisma.reservation.groupBy({
        by: ['source'],
        where: { propertyId, checkIn: range },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.reservation.findMany({
        where: { propertyId, checkIn: range },
        select: { checkIn: true, totalAmount: true, source: true },
        orderBy: { checkIn: 'asc' },
      }),
    ]);

    const totalRevenue = bySource.reduce((s, r) => s + Number(r._sum.totalAmount ?? 0), 0);
    return { totalRevenue, bySource, daily };
  }

  async getGuestReport(propertyId: string, params: any = {}) {
    const range = this.dateRange(params.startDate, params.endDate);

    const [topSpenders, repeatGuests, newGuests] = await Promise.all([
      this.prisma.guest.findMany({
        where: { reservations: { some: { propertyId, checkIn: range } } },
        orderBy: { totalSpent: 'desc' },
        take: 10,
        select: { firstName: true, lastName: true, email: true, totalStays: true, totalSpent: true },
      }),
      this.prisma.guest.count({
        where: { reservations: { some: { propertyId } }, totalStays: { gt: 1 } },
      }),
      this.prisma.guest.count({
        where: { createdAt: range },
      }),
    ]);

    return { topSpenders, repeatGuests, newGuests };
  }

  async getHousekeepingReport(propertyId: string, params: any = {}) {
    const range = this.dateRange(params.startDate, params.endDate);

    const [total, completed, pending, inProgress] = await Promise.all([
      this.prisma.housekeepingTask.count({ where: { propertyId, createdAt: range } }),
      this.prisma.housekeepingTask.count({ where: { propertyId, status: 'COMPLETED', createdAt: range } }),
      this.prisma.housekeepingTask.count({ where: { propertyId, status: 'PENDING', createdAt: range } }),
      this.prisma.housekeepingTask.count({ where: { propertyId, status: 'IN_PROGRESS', createdAt: range } }),
    ]);

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, inProgress, completionRate };
  }

  async getMaintenanceReport(propertyId: string, params: any = {}) {
    const range = this.dateRange(params.startDate, params.endDate);

    const [total, byStatus, byPriority] = await Promise.all([
      this.prisma.workOrder.count({ where: { tenantId: propertyId, createdAt: range } }),
      this.prisma.workOrder.groupBy({
        by: ['status'],
        where: { tenantId: propertyId, createdAt: range },
        _count: { id: true },
      }),
      this.prisma.workOrder.groupBy({
        by: ['priority'],
        where: { tenantId: propertyId, createdAt: range },
        _count: { id: true },
      }),
    ]);

    return { total, byStatus, byPriority };
  }

  async getFinancialSummary(propertyId: string, params: any = {}) {
    const range = this.dateRange(params.startDate, params.endDate);

    const [revenue, payments] = await Promise.all([
      this.prisma.reservation.aggregate({
        where: { propertyId, checkIn: range },
        _sum: { totalAmount: true },
      }),
      this.prisma.payment.groupBy({
        by: ['method'],
        where: { reservation: { propertyId }, createdAt: range, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalRevenue: Number(revenue._sum.totalAmount ?? 0),
      byPaymentMethod: payments,
    };
  }
}
