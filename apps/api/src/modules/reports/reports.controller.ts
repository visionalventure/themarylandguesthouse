import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('occupancy')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Occupancy report by date range' })
  getOccupancy(@Query() query: any) {
    return this.service.getOccupancyReport(query.propertyId, query);
  }

  @Get('revenue')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Revenue by source and period' })
  getRevenue(@Query() query: any) {
    return this.service.getRevenueReport(query.propertyId, query);
  }

  @Get('guests')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Guest analytics: top spenders, repeat, new' })
  getGuests(@Query() query: any) {
    return this.service.getGuestReport(query.propertyId, query);
  }

  @Get('housekeeping')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Housekeeping efficiency report' })
  getHousekeeping(@Query() query: any) {
    return this.service.getHousekeepingReport(query.propertyId, query);
  }

  @Get('maintenance')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Maintenance work order report' })
  getMaintenance(@Query() query: any) {
    return this.service.getMaintenanceReport(query.propertyId, query);
  }

  @Get('financial-summary')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Financial summary: revenue vs costs' })
  getFinancialSummary(@Query() query: any) {
    return this.service.getFinancialSummary(query.propertyId, query);
  }

  @Get('export')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Export report as CSV' })
  async exportCsv(@Query() query: any, @Res() res: Response) {
    const { type = 'occupancy', propertyId, startDate, endDate } = query;
    const params = { startDate, endDate };

    let data: any[] = [];
    let filename = `${type}-report`;

    if (type === 'occupancy') {
      const report = await this.service.getOccupancyReport(propertyId, params) as any;
      data = report.byCategory ?? [];
      filename = 'occupancy-report';
    } else if (type === 'revenue') {
      const report = await this.service.getRevenueReport(propertyId, params) as any;
      data = report.bySource ?? [];
      filename = 'revenue-report';
    } else if (type === 'guests') {
      const report = await this.service.getGuestReport(propertyId, params) as any;
      data = report.topSpenders ?? [];
      filename = 'guest-report';
    }

    const csv = this.toCSV(data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  }

  private toCSV(rows: any[]): string {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const lines = [
      headers.join(','),
      ...rows.map(r =>
        headers.map(h => {
          const v = r[h] ?? '';
          return typeof v === 'string' && v.includes(',') ? `"${v}"` : v;
        }).join(',')
      ),
    ];
    return lines.join('\n');
  }
}
