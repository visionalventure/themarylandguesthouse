import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'dashboard', version: '1' })
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'Get real-time KPI metrics' })
  getKPIs(@Request() req: any, @Query('propertyId') propertyId: string) {
    return this.dashboardService.getKPIs(propertyId, req.user.tenantId);
  }

  @Get('revenue-chart')
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
  getOccupancyChart(@Query('propertyId') propertyId: string, @Query('days') days?: number) {
    return this.dashboardService.getOccupancyChart(propertyId, days);
  }

  @Get('revenue-by-category')
  @ApiOperation({ summary: 'Get revenue breakdown by category' })
  getRevenueByCategory(@Request() req: any, @Query('propertyId') propertyId: string) {
    return this.dashboardService.getRevenueByCategory(req.user.tenantId, propertyId);
  }

  @Get('booking-sources')
  @ApiOperation({ summary: 'Get booking sources distribution' })
  getBookingSources(@Query('propertyId') propertyId: string) {
    return this.dashboardService.getBookingSourcesChart(propertyId);
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Get recent activity feed' })
  getRecentActivity(@Request() req: any, @Query('propertyId') propertyId: string) {
    return this.dashboardService.getRecentActivity(req.user.tenantId, propertyId);
  }

  @Get('front-desk')
  @ApiOperation({ summary: 'Front desk summary — arrivals, departures, room status, balances' })
  getFrontDeskSummary(@Query('propertyId') propertyId: string) {
    return this.dashboardService.getFrontDeskSummary(propertyId);
  }
}
