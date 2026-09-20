import { Controller, Get, Post, Patch, Param, Body, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { NightAuditService } from './nightaudit.service';
import { RunAuditDto } from './dto/nightaudit.dto';

@ApiTags('night-audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'nightaudit', version: '1' })
export class NightAuditController {
  constructor(private readonly service: NightAuditService) {}

  @Post('preview')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Preview night audit — returns expected summary without posting any charges' })
  previewAudit(@Body() dto: RunAuditDto, @Request() req: any) {
    return this.service.previewAudit(dto.propertyId, dto.auditDate, req.user.tenantId);
  }

  @Post('run')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Run night audit for a given date — posts nightly charges, marks no-shows' })
  runAudit(@Body() dto: RunAuditDto, @Request() req: any) {
    return this.service.runAudit(dto.propertyId, dto.auditDate, req.user.sub, req.user.tenantId);
  }

  @Get('history')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Get audit history for a property' })
  getHistory(@Query('propertyId') propertyId: string, @Request() req: any) {
    return this.service.getHistory(propertyId, req.user.tenantId);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Get night audit details' })
  getAudit(@Param('id') id: string, @Request() req: any) {
    return this.service.getAudit(id, req.user.tenantId);
  }

  @Patch(':id/close')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Close the night audit' })
  closeAudit(@Param('id') id: string, @Request() req: any) {
    return this.service.closeAudit(id, req.user.tenantId);
  }
}
