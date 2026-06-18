import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GuestsService } from './guests.service';

@ApiTags('guests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'guests', version: '1' })
export class GuestsController {
  constructor(private readonly service: GuestsService) {}

  @Get()
  @ApiOperation({ summary: 'List guests with search and filters' })
  findAll(@Query() query: any) {
    return this.service.findAll(query.tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get guest profile with history' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create guest profile' })
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update guest profile' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
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
