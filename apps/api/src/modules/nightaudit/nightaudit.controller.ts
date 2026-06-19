import { Controller, Get, Post, Patch, Param, Body, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { NightAuditService } from './nightaudit.service';

@ApiTags('night-audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'nightaudit', version: '1' })
export class NightAuditController {
  constructor(private readonly service: NightAuditService) {}

  @Post('run')
  @ApiOperation({ summary: 'Run night audit for a given date — posts nightly charges, marks no-shows' })
  runAudit(@Body() dto: { propertyId: string; auditDate: string }, @Request() req: any) {
    return this.service.runAudit(dto.propertyId, dto.auditDate, req.user.sub);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get audit history for a property' })
  getHistory(@Query('propertyId') propertyId: string) {
    return this.service.getHistory(propertyId);
  }

  @Get(':id')
  getAudit(@Param('id') id: string) {
    return this.service.getAudit(id);
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Close the night audit' })
  closeAudit(@Param('id') id: string) {
    return this.service.closeAudit(id);
  }
}
