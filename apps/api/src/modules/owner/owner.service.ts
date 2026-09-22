import { Injectable } from '@nestjs/common';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { AccountingService } from '../accounting/accounting.service';
import { HrService } from '../hr/hr.service';
import { DocumentsService } from '../documents/documents.service';
import { ReportsService } from '../reports/reports.service';
import { RestaurantService } from '../restaurant/restaurant.service';

@Injectable()
export class OwnerService {
  constructor(
    private prisma: PrismaService,
    private dashboardService: DashboardService,
    private accountingService: AccountingService,
    private hrService: HrService,
    private documentsService: DocumentsService,
    private reportsService: ReportsService,
    private restaurantService: RestaurantService,
  ) {}

  async getOverview(propertyId: string, tenantId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, tenantId },
      select: { id: true, name: true },
    });
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const period = format(now, 'yyyy-MM');

    const [
      kpis,
      revenueByCategory,
      revenueChart,
      bookingSources,
      profitAndLoss,
      agedReceivables,
      hrStats,
      payroll,
      departments,
      compliance,
      housekeeping,
      maintenance,
      restaurants,
    ] = await Promise.all([
      this.dashboardService.getKPIs(propertyId, tenantId),
      this.dashboardService.getRevenueByCategory(tenantId, propertyId),
      this.dashboardService.getRevenueChart(propertyId, tenantId, 30),
      this.dashboardService.getBookingSourcesChart(propertyId, tenantId),
      this.accountingService.getProfitAndLoss(propertyId, tenantId, monthStart, monthEnd),
      this.accountingService.getAgedReceivables(tenantId),
      this.hrService.getHRDashboardStats(propertyId, tenantId),
      this.hrService.getPayrollSummary(propertyId, tenantId, period),
      this.hrService.getDepartments(tenantId),
      this.documentsService.getComplianceReport(propertyId, tenantId),
      this.reportsService.getHousekeepingReport(propertyId, tenantId, {}),
      this.reportsService.getMaintenanceReport(propertyId, tenantId, {}),
      this.restaurantService.getRestaurants(propertyId, tenantId),
    ]);

    const headcountByDepartment = departments.map((d: any) => ({
      department: d.name,
      employees: d._count.employees,
    }));
    const maintenanceByStatus = maintenance.byStatus.map((s: any) => ({ status: s.status, count: s._count.id }));
    const maintenanceByPriority = maintenance.byPriority.map((p: any) => ({ priority: p.priority, count: p._count.id }));

    const restaurant = restaurants[0];
    const restaurantRevenue = restaurant
      ? await this.restaurantService.getRevenue(restaurant.id, tenantId, {
          startDate: monthStart.toISOString(),
          endDate: monthEnd.toISOString(),
        })
      : null;

    return {
      property,
      generatedAt: new Date().toISOString(),
      period: { startDate: monthStart, endDate: monthEnd },
      financial: {
        revenueToday: kpis.revenueToday,
        revenueThisMonth: kpis.revenueThisMonth,
        outstandingInvoicesAmount: kpis.outstandingInvoicesAmount,
        outstandingInvoicesCount: kpis.outstandingInvoicesCount,
        revenueByCategory,
        profitAndLoss: {
          totalRevenue: profitAndLoss.totalRevenue,
          totalExpenses: profitAndLoss.totalExpenses,
          netProfit: profitAndLoss.netProfit,
          revenue: profitAndLoss.revenue,
          expenses: profitAndLoss.expenses,
        },
        agedReceivables: agedReceivables.buckets,
        agedReceivablesDetails: agedReceivables.details,
      },
      bookings: {
        occupancyRate: kpis.occupancyRate,
        totalRooms: kpis.totalRooms,
        occupiedRooms: kpis.occupiedRooms,
        apartmentOccupancyRate: kpis.apartmentOccupancyRate,
        totalApartments: kpis.totalApartments,
        occupiedApartments: kpis.occupiedApartments,
        checkInsToday: kpis.checkInsToday,
        checkOutsToday: kpis.checkOutsToday,
        activeShortStays: kpis.activeShortStays,
        revenueChart,
        bookingSources,
      },
      people: {
        totalEmployees: hrStats.totalEmployees,
        activeEmployees: hrStats.activeEmployees,
        onLeave: hrStats.onLeave,
        suspended: hrStats.suspended,
        pendingLeaves: hrStats.pendingLeaves,
        pendingApprovals: hrStats.pendingApprovals,
        openDisciplinaryCases: hrStats.openDisciplinaryCases,
        contractsExpiring: hrStats.contractsExpiring,
        presentStaff: kpis.presentStaff,
        payrollThisPeriod: payroll.summary,
        headcountByDepartment,
      },
      compliance: {
        total: compliance.total,
        withExpiry: compliance.withExpiry,
        validCount: compliance.validCount,
        complianceScore: compliance.complianceScore,
        expiredCount: compliance.expired.length,
        expiring30Count: compliance.expiring30.length,
        expiring90Count: compliance.expiring90.length,
        expired: compliance.expired,
        expiring30: compliance.expiring30,
      },
      operations: {
        housekeeping,
        maintenance: { total: maintenance.total, byStatus: maintenanceByStatus, byPriority: maintenanceByPriority },
        pendingMaintenance: kpis.pendingMaintenance,
        lowStockAlerts: kpis.lowStockAlerts,
        restaurantRevenue: restaurantRevenue
          ? { total: restaurantRevenue.total, orderCount: restaurantRevenue.orderCount, topItems: restaurantRevenue.topItems }
          : null,
      },
    };
  }
}
