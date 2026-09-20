import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { HousekeepingService } from './housekeeping.service';
import { HousekeepingQueryDto, CreateHousekeepingTaskDto, UpdateHousekeepingTaskDto } from './dto/housekeeping.dto';

@ApiTags('housekeeping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'housekeeping', version: '1' })
export class HousekeepingController {
  constructor(private readonly service: HousekeepingService) {}

  @Get('tasks')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HOUSEKEEPING', 'FRONT_DESK')
  @ApiOperation({ summary: 'List housekeeping tasks with filters' })
  getTasks(@Query() query: HousekeepingQueryDto, @Request() req: any) {
    return this.service.getTasks(query.propertyId, req.user.tenantId, query);
  }

  @Post('tasks')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HOUSEKEEPING', 'FRONT_DESK')
  @ApiOperation({ summary: 'Create a housekeeping task' })
  createTask(@Body() dto: CreateHousekeepingTaskDto, @Request() req: any) {
    return this.service.createTask(dto, req.user.tenantId);
  }

  @Patch('tasks/:id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HOUSEKEEPING')
  @ApiOperation({ summary: 'Update task status / assignee / notes' })
  updateTask(@Param('id') id: string, @Body() dto: UpdateHousekeepingTaskDto, @Request() req: any) {
    return this.service.updateTask(id, dto, req.user.tenantId);
  }

  @Get('schedule')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HOUSEKEEPING', 'FRONT_DESK')
  @ApiOperation({ summary: "Today's schedule grouped by floor" })
  getSchedule(@Query('propertyId') propertyId: string, @Query('date') date: string, @Request() req: any) {
    return this.service.getDailySchedule(propertyId, req.user.tenantId, date);
  }

  @Get('rooms-status')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HOUSEKEEPING', 'FRONT_DESK')
  @ApiOperation({ summary: 'All rooms with current housekeeping status' })
  getRoomsStatus(@Query('propertyId') propertyId: string, @Request() req: any) {
    return this.service.getRoomsStatus(propertyId, req.user.tenantId);
  }
}
