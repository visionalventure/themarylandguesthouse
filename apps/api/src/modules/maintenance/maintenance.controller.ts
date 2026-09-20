import { Controller, Get, Post, Patch, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { MaintenanceService } from './maintenance.service';
import {
  WorkOrderQueryDto, CreateWorkOrderDto, UpdateWorkOrderDto,
  AssetQueryDto, CreateAssetDto, UpdateAssetDto,
} from './dto/maintenance.dto';

@ApiTags('maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'maintenance', version: '1' })
export class MaintenanceController {
  constructor(private readonly service: MaintenanceService) {}

  @Get('work-orders')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MAINTENANCE', 'FRONT_DESK')
  @ApiOperation({ summary: 'List work orders' })
  getWorkOrders(@Query() query: WorkOrderQueryDto, @Request() req: any) {
    return this.service.getWorkOrders(req.user.tenantId, query);
  }

  @Post('work-orders')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MAINTENANCE', 'FRONT_DESK')
  @ApiOperation({ summary: 'Create work order' })
  createWorkOrder(@Body() dto: CreateWorkOrderDto, @Request() req: any) {
    return this.service.createWorkOrder({ ...dto, tenantId: req.user.tenantId });
  }

  @Patch('work-orders/:id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MAINTENANCE')
  @ApiOperation({ summary: 'Update work order status/assignee' })
  updateWorkOrder(@Param('id') id: string, @Body() dto: UpdateWorkOrderDto, @Request() req: any) {
    return this.service.updateWorkOrder(id, dto, req.user.tenantId);
  }

  @Get('assets')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MAINTENANCE')
  @ApiOperation({ summary: 'List assets' })
  getAssets(@Query() query: AssetQueryDto, @Request() req: any) {
    return this.service.getAssets(query.propertyId, req.user.tenantId, query);
  }

  @Post('assets')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create asset' })
  createAsset(@Body() dto: CreateAssetDto, @Request() req: any) {
    return this.service.createAsset(dto, req.user.tenantId);
  }

  @Put('assets/:id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MAINTENANCE')
  @ApiOperation({ summary: 'Update asset' })
  updateAsset(@Param('id') id: string, @Body() dto: UpdateAssetDto, @Request() req: any) {
    return this.service.updateAsset(id, dto, req.user.tenantId);
  }

  @Get('schedule')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MAINTENANCE')
  @ApiOperation({ summary: 'Upcoming preventive maintenance schedule' })
  getSchedule(@Query('propertyId') propertyId: string, @Request() req: any) {
    return this.service.getSchedule(propertyId, req.user.tenantId);
  }
}
