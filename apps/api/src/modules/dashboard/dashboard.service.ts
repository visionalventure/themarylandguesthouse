import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private async assertPropertyTenant(propertyId: string, tenantId: string) {
    const prop = await this.prisma.property.findFirst({ where: { id: propertyId, tenantId } });
    if (!prop) throw new ForbiddenException('Property not found or access denied');
  }

  async getKPIs(propertyId: string, tenantId: string) {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    const [
      totalRooms,
      occupiedRooms,
      availableRooms,
      checkInsToday,
      checkOutsToday,
      revenueToday,
      revenueThisMonth,
      outstandingInvoices,
      lowStockAlerts,
      pendingMaintenance,
      presentStaff,
    ] = await Promise.all([
      this.prisma.room.count({ where: { propertyId, isActive: true } }),
      this.prisma.room.count({ where: { propertyId, status: 'OCCUPIED' } }),
      this.prisma.room.count({ where: { propertyId, status: 'AVAILABLE' } }),
      this.prisma.reservation.count({
        where: {
          propertyId,
          checkIn: { gte: todayStart, lte: todayEnd },
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        },
      }),
      this.prisma.reservation.count({
        where: {
          propertyId,
          checkOut: { gte: todayStart, lte: todayEnd },
          status: 'CHECKED_IN',
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          tenantId,
          status: 'COMPLETED',
          processedAt: { gte: todayStart, lte: todayEnd },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          tenantId,
          status: 'COMPLETED',
          processedAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          status: { in: ['SENT', 'OVERDUE', 'PARTIALLY_PAID'] },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.prisma.inventoryItem.count({
        where: {
          propertyId,
          isActive: true,
          currentStock: { lte: this.prisma.inventoryItem.fields.reorderPoint },
        },
      }),
      this.prisma.workOrder.count({
        where: { tenantId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      }),
      this.prisma.attendance.count({
        where: {
          date: todayStart,
          status: 'PRESENT',
          employee: { propertyId },
        },
      }),
    ]);

    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    return {
      occupancyRate,
      totalRooms,
      occupiedRooms,
      availableRooms,
      checkInsToday,
      checkOutsToday,
      revenueToday: Number(revenueToday._sum.amount || 0),
      revenueThisMonth: Number(revenueThisMonth._sum.amount || 0),
      outstandingInvoicesAmount: Number(outstandingInvoices._sum.totalAmount || 0),
      outstandingInvoicesCount: outstandingInvoices._count,
      lowStockAlerts,
      pendingMaintenance,
      presentStaff,
    };
  }

  async getRevenueChart(propertyId: string, tenantId: string, days = 30) {
    const endDate = new Date();
    const startDate = subDays(endDate, days);

    const payments = await this.prisma.payment.findMany({
      where: {
        tenantId,
        status: 'COMPLETED',
        processedAt: { gte: startDate, lte: endDate },
      },
      select: { amount: true, processedAt: true },
      orderBy: { processedAt: 'asc' },
    });

    const grouped: Record<string, number> = {};
    payments.forEach((p) => {
      if (!p.processedAt) return;
      const date = p.processedAt.toISOString().split('T')[0];
      grouped[date] = (grouped[date] || 0) + Number(p.amount);
    });

    return Object.entries(grouped).map(([date, revenue]) => ({ date, revenue }));
  }

  async getOccupancyChart(propertyId: string, tenantId: string, days = 30) {
    await this.assertPropertyTenant(propertyId, tenantId);
    const results = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStart = startOfDay(date);
      const dateEnd = endOfDay(date);

      const occupied = await this.prisma.reservation.count({
        where: {
          propertyId,
          status: { in: ['CHECKED_IN', 'CONFIRMED'] },
          checkIn: { lte: dateEnd },
          checkOut: { gte: dateStart },
        },
      });

      results.push({
        date: date.toISOString().split('T')[0],
        occupied,
      });
    }

    return results;
  }

  async getRevenueByCategory(tenantId: string, propertyId: string) {
    const monthStart = startOfMonth(new Date());

    const [roomRevenue, fbRevenue] = await Promise.all([
      this.prisma.reservationCharge.aggregate({
        where: { chargeType: 'ROOM', reservation: { propertyId } },
        _sum: { amount: true },
      }),
      this.prisma.restaurantOrder.aggregate({
        where: { restaurant: { propertyId }, createdAt: { gte: monthStart } },
        _sum: { totalAmount: true },
      }),
    ]);

    return [
      { category: 'Room Revenue', amount: Number(roomRevenue._sum.amount || 0) },
      { category: 'Food & Beverage', amount: Number(fbRevenue._sum.totalAmount || 0) },
    ];
  }

  async getBookingSourcesChart(propertyId: string, tenantId: string) {
    await this.assertPropertyTenant(propertyId, tenantId);
    const sources = await this.prisma.reservation.groupBy({
      by: ['source'],
      where: { propertyId, createdAt: { gte: subMonths(new Date(), 1) } },
      _count: true,
    });

    return sources.map((s) => ({
      source: s.source || 'Unknown',
      count: s._count,
    }));
  }

  async getRecentActivity(tenantId: string, propertyId: string, limit = 10) {
    const [recentReservations, recentPayments, recentMaintenance] = await Promise.all([
      this.prisma.reservation.findMany({
        where: { propertyId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          reservationNo: true,
          status: true,
          checkIn: true,
          checkOut: true,
          createdAt: true,
          guest: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.payment.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, amount: true, method: true, status: true, createdAt: true },
      }),
      this.prisma.workOrder.findMany({
        where: { tenantId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, priority: true, status: true, createdAt: true },
      }),
    ]);

    return { recentReservations, recentPayments, recentMaintenance };
  }

  async getFrontDeskSummary(propertyId: string, tenantId: string) {
    await this.assertPropertyTenant(propertyId, tenantId);
    const today = startOfDay(new Date());
    const tomorrow = new Date(today.getTime() + 86400000);

    const [
      arrivals,
      departures,
      occupiedRooms,
      totalRooms,
      pendingPaymentsAgg,
      recentArrivals,
      recentDepartures,
      roomsStatus,
    ] = await Promise.all([
      this.prisma.reservation.count({
        where: { propertyId, checkIn: { gte: today, lt: tomorrow }, status: { in: ['RESERVED', 'CONFIRMED'] } },
      }),
      this.prisma.reservation.count({
        where: { propertyId, checkOut: { gte: today, lt: tomorrow }, status: 'CHECKED_IN' },
      }),
      this.prisma.room.count({ where: { propertyId, status: 'OCCUPIED' } }),
      this.prisma.room.count({ where: { propertyId, isActive: true } }),
      this.prisma.invoice.aggregate({
        _sum: { totalAmount: true, paidAmount: true },
        where: { propertyId, status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] } },
      }),
      this.prisma.reservation.findMany({
        where: { propertyId, checkIn: { gte: today, lt: tomorrow }, status: { in: ['RESERVED', 'CONFIRMED'] } },
        include: { guest: { select: { firstName: true, lastName: true } }, rooms: { include: { room: { select: { roomNumber: true } } } } },
        orderBy: { checkIn: 'asc' },
        take: 10,
      }),
      this.prisma.reservation.findMany({
        where: { propertyId, checkOut: { gte: today, lt: tomorrow }, status: 'CHECKED_IN' },
        include: { guest: { select: { firstName: true, lastName: true } }, rooms: { include: { room: { select: { roomNumber: true } } } } },
        orderBy: { checkOut: 'asc' },
        take: 10,
      }),
      this.prisma.room.findMany({
        where: { propertyId, isActive: true },
        select: { id: true, roomNumber: true, status: true, floor: true, category: { select: { name: true } } },
        orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
      }),
    ]);

    const outstanding =
      Number(pendingPaymentsAgg._sum.totalAmount ?? 0) -
      Number(pendingPaymentsAgg._sum.paidAmount ?? 0);

    return {
      stats: {
        arrivals,
        departures,
        occupiedRooms,
        availableRooms: totalRooms - occupiedRooms,
        totalRooms,
        occupancyRate: totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
        outstandingBalance: outstanding,
      },
      recentArrivals,
      recentDepartures,
      roomsStatus,
    };
  }
}
