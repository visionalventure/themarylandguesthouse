import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { HousekeepingService } from './housekeeping.service';

@ApiTags('housekeeping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'housekeeping', version: '1' })
export class HousekeepingController {
  constructor(private readonly service: HousekeepingService) {}

  @Get('tasks')
  @ApiOperation({ summary: 'List housekeeping tasks with filters' })
  getTasks(@Query() query: any) {
    return this.service.getTasks(query.propertyId, query);
  }

  @Post('tasks')
  @ApiOperation({ summary: 'Create a housekeeping task' })
  createTask(@Body() dto: any) {
    return this.service.createTask(dto);
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Update task status / assignee / notes' })
  updateTask(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateTask(id, dto);
  }

  @Get('schedule')
  @ApiOperation({ summary: "Today's schedule grouped by floor" })
  getSchedule(@Query('propertyId') propertyId: string, @Query('date') date: string) {
    return this.service.getDailySchedule(propertyId, date);
  }

  @Get('rooms-status')
  @ApiOperation({ summary: 'All rooms with current housekeeping status' })
  getRoomsStatus(@Query('propertyId') propertyId: string) {
    return this.service.getRoomsStatus(propertyId);
  }
}
