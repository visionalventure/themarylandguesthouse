import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { GuestsService } from './guests.service';

@ApiTags('guests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'guests', version: '1' })
export class GuestsController {
  constructor(private readonly service: GuestsService) {}

  @Get()
  @ApiOperation({ summary: 'List guests with search and filters' })
  findAll(@Query() query: any, @Request() req: any) {
    return this.service.findAll(req.user.tenantId, query, req.user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get guest profile with history' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.service.findOne(id, req.user.role);
  }

  @Post()
  @ApiOperation({ summary: 'Create guest profile' })
  create(@Body() dto: any, @Request() req: any) {
    return this.service.create({ ...dto, tenantId: req.user.tenantId });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update guest profile' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Post(':id/reveal-identity')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Reveal confidential guest identity (creates audit log)' })
  revealIdentity(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Request() req: any,
  ) {
    // x-forwarded-for may be a comma-separated proxy chain; take leftmost (real client IP)
    const forwarded = req.headers['x-forwarded-for'] as string | undefined;
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress;
    return this.service.revealIdentity(id, req.user.sub, req.user.tenantId, body.reason, ip);
  }

  @Get(':id/stay-history')
  @ApiOperation({ summary: 'Get guest stay history' })
  getStayHistory(@Param('id') id: string) {
    return this.service.getStayHistory(id);
  }

  @Get(':id/spending')
  @ApiOperation({ summary: 'Get guest spending analysis' })
  getSpending(@Param('id') id: string) {
    return this.service.getSpendingAnalysis(id);
  }
}
