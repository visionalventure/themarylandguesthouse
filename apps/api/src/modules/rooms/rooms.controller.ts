import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RoomsService } from './rooms.service';
import {
  RoomsQueryDto, AvailableRoomsQueryDto, CreateRoomCategoryDto, UpdateRoomCategoryDto,
  CreateRoomDto, UpdateRoomDto, UpdateRoomStatusDto, CreateRoomPricingDto, UpdateRoomPricingDto,
} from './dto/rooms.dto';

@ApiTags('rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'rooms', version: '1' })
export class RoomsController {
  constructor(private readonly service: RoomsService) {}

  @Get()
  @ApiOperation({ summary: 'List rooms with status filters' })
  findAll(@Query() query: RoomsQueryDto, @Request() req: any) {
    return this.service.findAll(query.propertyId, req.user.tenantId, query);
  }

  @Get('available')
  @ApiOperation({ summary: 'Find available rooms for date range' })
  findAvailable(@Query() query: AvailableRoomsQueryDto, @Request() req: any) {
    return this.service.findAvailable(query.propertyId, req.user.tenantId, new Date(query.checkIn), new Date(query.checkOut));
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get room categories/types' })
  getCategories(@Query('propertyId') propertyId: string, @Query('type') type: string, @Request() req: any) {
    return this.service.getCategories(propertyId, req.user.tenantId, type);
  }

  @Post('categories')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a room category' })
  createCategory(@Body() dto: CreateRoomCategoryDto, @Request() req: any) {
    return this.service.createCategory(dto, req.user.tenantId);
  }

  @Put('categories/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a room category' })
  updateCategory(@Param('id') id: string, @Body() dto: UpdateRoomCategoryDto, @Request() req: any) {
    return this.service.updateCategory(id, dto, req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get room details' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.service.findOne(id, req.user.tenantId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create new room' })
  create(@Body() dto: CreateRoomDto, @Request() req: any) {
    return this.service.create(dto, req.user.tenantId);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update room' })
  update(@Param('id') id: string, @Body() dto: UpdateRoomDto, @Request() req: any) {
    return this.service.update(id, dto, req.user.tenantId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Delete a room (hidden instead if it has booking/operational history)' })
  deleteRoom(@Param('id') id: string, @Request() req: any) {
    return this.service.deleteRoom(id, req.user.tenantId);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Update room status' })
  updateStatus(@Param('id') id: string, @Body() body: UpdateRoomStatusDto, @Request() req: any) {
    return this.service.updateStatus(id, body.status, req.user.tenantId);
  }

  @Get(':id/pricing')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Get pricing rules for a room' })
  getRoomPricing(@Param('id') id: string, @Request() req: any) {
    return this.service.getRoomPricing(id, req.user.tenantId);
  }

  @Post(':id/pricing')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Add a pricing rule to a room' })
  createRoomPricing(@Param('id') id: string, @Body() dto: CreateRoomPricingDto, @Request() req: any) {
    return this.service.createRoomPricing(id, dto, req.user.tenantId);
  }

  @Put('pricing/:pricingId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a room pricing rule' })
  updateRoomPricing(@Param('pricingId') pricingId: string, @Body() dto: UpdateRoomPricingDto, @Request() req: any) {
    return this.service.updateRoomPricing(pricingId, dto, req.user.tenantId);
  }

  @Delete('pricing/:pricingId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Delete a room pricing rule' })
  deleteRoomPricing(@Param('pricingId') pricingId: string, @Request() req: any) {
    return this.service.deleteRoomPricing(pricingId, req.user.tenantId);
  }
}
