import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoomsService } from './rooms.service';

@ApiTags('rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'rooms', version: '1' })
export class RoomsController {
  constructor(private readonly service: RoomsService) {}

  @Get()
  @ApiOperation({ summary: 'List rooms with status filters' })
  findAll(@Query() query: any) {
    return this.service.findAll(query.propertyId, query);
  }

  @Get('available')
  @ApiOperation({ summary: 'Find available rooms for date range' })
  findAvailable(@Query() query: any) {
    return this.service.findAvailable(query.propertyId, new Date(query.checkIn), new Date(query.checkOut));
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get room categories/types' })
  getCategories(@Query('propertyId') propertyId: string) {
    return this.service.getCategories(propertyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get room details' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new room' })
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update room' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update room status' })
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.service.updateStatus(id, body.status);
  }
}
