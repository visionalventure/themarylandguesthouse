import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'dashboard', version: '1' })
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('kpis')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get real-time KPI metrics' })
  getKPIs(@Request() req: any, @Query('propertyId') propertyId: string) {
    return this.dashboardService.getKPIs(propertyId, req.user.tenantId);
  }

  @Get('revenue-chart')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Get revenue trend chart data' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getRevenueChart(
    @Request() req: any,
    @Query('propertyId') propertyId: string,
    @Query('days') days?: number,
  ) {
    return this.dashboardService.getRevenueChart(propertyId, req.user.tenantId, days);
  }

  @Get('occupancy-chart')
  @ApiOperation({ summary: 'Get occupancy trend chart data' })
  getOccupancyChart(@Request() req: any, @Query('propertyId') propertyId: string, @Query('days') days?: number) {
    return this.dashboardService.getOccupancyChart(propertyId, req.user.tenantId, days);
  }

  @Get('revenue-by-category')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Get revenue breakdown by category' })
  getRevenueByCategory(@Request() req: any, @Query('propertyId') propertyId: string) {
    return this.dashboardService.getRevenueByCategory(req.user.tenantId, propertyId);
  }

  @Get('booking-sources')
  @ApiOperation({ summary: 'Get booking sources distribution' })
  getBookingSources(@Request() req: any, @Query('propertyId') propertyId: string) {
    return this.dashboardService.getBookingSourcesChart(propertyId, req.user.tenantId);
  }

  @Get('recent-activity')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get recent activity feed' })
  getRecentActivity(@Request() req: any, @Query('propertyId') propertyId: string) {
    return this.dashboardService.getRecentActivity(req.user.tenantId, propertyId);
  }

  @Get('front-desk')
  @ApiOperation({ summary: 'Front desk summary — arrivals, departures, room status, balances' })
  getFrontDeskSummary(@Request() req: any, @Query('propertyId') propertyId: string) {
    return this.dashboardService.getFrontDeskSummary(propertyId, req.user.tenantId);
  }
}
