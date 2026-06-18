import { Controller, Get, Post, Patch, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MaintenanceService } from './maintenance.service';

@ApiTags('maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'maintenance', version: '1' })
export class MaintenanceController {
  constructor(private readonly service: MaintenanceService) {}

  @Get('work-orders')
  @ApiOperation({ summary: 'List work orders' })
  getWorkOrders(@Query() query: any) {
    return this.service.getWorkOrders(query.propertyId, query);
  }

  @Post('work-orders')
  @ApiOperation({ summary: 'Create work order' })
  createWorkOrder(@Body() dto: any) {
    return this.service.createWorkOrder(dto);
  }

  @Patch('work-orders/:id')
  @ApiOperation({ summary: 'Update work order status/assignee' })
  updateWorkOrder(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateWorkOrder(id, dto);
  }

  @Get('assets')
  @ApiOperation({ summary: 'List assets' })
  getAssets(@Query() query: any) {
    return this.service.getAssets(query.propertyId, query);
  }

  @Post('assets')
  @ApiOperation({ summary: 'Create asset' })
  createAsset(@Body() dto: any) {
    return this.service.createAsset(dto);
  }

  @Put('assets/:id')
  @ApiOperation({ summary: 'Update asset' })
  updateAsset(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateAsset(id, dto);
  }

  @Get('schedule')
  @ApiOperation({ summary: 'Upcoming preventive maintenance schedule' })
  getSchedule(@Query('propertyId') propertyId: string) {
    return this.service.getSchedule(propertyId);
  }
}
