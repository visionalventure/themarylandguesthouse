import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
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
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create new room' })
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update room' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Update room status' })
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.service.updateStatus(id, body.status);
  }

  @Get(':id/pricing')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Get pricing rules for a room' })
  getRoomPricing(@Param('id') id: string) {
    return this.service.getRoomPricing(id);
  }

  @Post(':id/pricing')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Add a pricing rule to a room' })
  createRoomPricing(@Param('id') id: string, @Body() dto: any) {
    return this.service.createRoomPricing(id, dto);
  }

  @Put('pricing/:pricingId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a room pricing rule' })
  updateRoomPricing(@Param('pricingId') pricingId: string, @Body() dto: any) {
    return this.service.updateRoomPricing(pricingId, dto);
  }

  @Delete('pricing/:pricingId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Delete a room pricing rule' })
  deleteRoomPricing(@Param('pricingId') pricingId: string) {
    return this.service.deleteRoomPricing(pricingId);
  }
}
