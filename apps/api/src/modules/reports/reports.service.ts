import { Injectable, ForbiddenException } from '@nestjs/common';
import { eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private dateRange(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();
    return { gte: start, lte: end };
  }

  private async assertPropertyTenant(propertyId: string, tenantId: string) {
    const prop = await this.prisma.property.findFirst({ where: { id: propertyId, tenantId } });
    if (!prop) throw new ForbiddenException('Property not found or access denied');
  }

  async getOccupancyReport(propertyId: string, tenantId: string, params: any = {}) {
    await this.assertPropertyTenant(propertyId, tenantId);
    const range = this.dateRange(params.startDate, params.endDate);
    const totalRooms = await this.prisma.room.count({ where: { propertyId, isActive: true } });

    const byDay = await Promise.all(
      eachDayOfInterval({ start: range.gte, end: range.lte }).map(async (day) => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);
        const occupiedRooms = await this.prisma.reservationRoom.count({
          where: {
            reservation: {
              propertyId,
              status: { in: ['CHECKED_IN', 'CHECKED_OUT', 'CONFIRMED'] },
              checkIn: { lte: dayEnd },
              checkOut: { gte: dayStart },
            },
          },
        });
        return {
          date: dayStart.toISOString().split('T')[0],
          occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 1000) / 10 : 0,
        };
      }),
    );

    const averageOccupancy = byDay.length > 0
      ? byDay.reduce((s, d) => s + d.occupancyRate, 0) / byDay.length
      : 0;

    const byCategory = await this.prisma.room.groupBy({
      by: ['categoryId'],
      where: { propertyId },
      _count: { id: true },
    });

    return { totalRooms, byDay, averageOccupancy, byCategory };
  }

  async getRevenueReport(propertyId: string, tenantId: string, params: any = {}) {
    await this.assertPropertyTenant(propertyId, tenantId);
    const range = this.dateRange(params.startDate, params.endDate);

    const [bySourceRaw, reservations] = await Promise.all([
      this.prisma.reservation.groupBy({
        by: ['source'],
        where: { propertyId, checkIn: range },
        _sum: { totalAmount: true },
      }),
      this.prisma.reservation.findMany({
        where: { propertyId, checkIn: range },
        select: { checkIn: true, totalAmount: true },
        orderBy: { checkIn: 'asc' },
      }),
    ]);

    const bySource = bySourceRaw.map((r) => ({ source: r.source, total: Number(r._sum.totalAmount ?? 0) }));
    const total = bySource.reduce((s, r) => s + r.total, 0);

    const grouped: Record<string, number> = {};
    reservations.forEach((r) => {
      const date = r.checkIn.toISOString().split('T')[0];
      grouped[date] = (grouped[date] || 0) + Number(r.totalAmount);
    });
    const byDay = Object.entries(grouped).map(([date, revenue]) => ({ date, revenue }));

    return { total, bySource, byDay };
  }

  async getGuestReport(propertyId: string, tenantId: string, params: any = {}) {
    await this.assertPropertyTenant(propertyId, tenantId);
    const range = this.dateRange(params.startDate, params.endDate);

    const [topGuests, total, repeatGuests, newGuests] = await Promise.all([
      this.prisma.guest.findMany({
        where: { tenantId, isDeleted: false, reservations: { some: { propertyId, checkIn: range } } },
        orderBy: { totalSpent: 'desc' },
        take: 10,
        select: { id: true, firstName: true, lastName: true, email: true, totalStays: true, totalSpent: true },
      }),
      this.prisma.guest.count({
        where: { tenantId, isDeleted: false, reservations: { some: { propertyId } } },
      }),
      this.prisma.guest.count({
        where: { tenantId, isDeleted: false, reservations: { some: { propertyId } }, totalStays: { gt: 1 } },
      }),
      this.prisma.guest.count({
        where: { tenantId, isDeleted: false, createdAt: range },
      }),
    ]);

    return { topGuests, total, repeatGuests, newGuests };
  }

  async getHousekeepingReport(propertyId: string, tenantId: string, params: any = {}) {
    await this.assertPropertyTenant(propertyId, tenantId);
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

  async getMaintenanceReport(propertyId: string, tenantId: string, params: any = {}) {
    await this.assertPropertyTenant(propertyId, tenantId);
    const range = this.dateRange(params.startDate, params.endDate);

    const [total, byStatus, byPriority] = await Promise.all([
      this.prisma.workOrder.count({ where: { tenantId, createdAt: range } }),
      this.prisma.workOrder.groupBy({
        by: ['status'],
        where: { tenantId, createdAt: range },
        _count: { id: true },
      }),
      this.prisma.workOrder.groupBy({
        by: ['priority'],
        where: { tenantId, createdAt: range },
        _count: { id: true },
      }),
    ]);

    return { total, byStatus, byPriority };
  }

  async getFinancialSummary(propertyId: string, tenantId: string, params: any = {}) {
    await this.assertPropertyTenant(propertyId, tenantId);
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
