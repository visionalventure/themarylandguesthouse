import { Controller, Get, Query, UseGuards, Res, Request } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { OwnerService } from './owner.service';

@ApiTags('owner')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'owner', version: '1' })
export class OwnerController {
  constructor(private readonly service: OwnerService) {}

  @Get('overview')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Comprehensive owner overview: financial, bookings, people, compliance, operations' })
  getOverview(@Request() req: any, @Query('propertyId') propertyId: string) {
    return this.service.getOverview(propertyId, req.user.tenantId);
  }

  @Get('overview/export')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Export a section of the owner overview as CSV' })
  async exportCsv(
    @Request() req: any,
    @Query('propertyId') propertyId: string,
    @Query('section') section: string,
    @Res() res: Response,
  ) {
    const overview = await this.service.getOverview(propertyId, req.user.tenantId);

    let rows: any[] = [];
    switch (section) {
      case 'financial':
        rows = overview.financial.agedReceivablesDetails;
        break;
      case 'bookings':
        rows = overview.bookings.revenueChart;
        break;
      case 'people':
        rows = overview.people.headcountByDepartment;
        break;
      case 'compliance':
        rows = overview.compliance.expiring30.map((d: any) => ({ name: d.name, category: d.category, expiryDate: d.expiryDate }));
        break;
      case 'operations':
        rows = overview.operations.maintenance.byStatus;
        break;
      default:
        rows = [];
    }

    const csv = this.toCSV(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="owner-overview-${section}-${new Date().toISOString().slice(0, 10)}.csv"`);
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
