import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ShortStayService } from './short-stay.service';
import {
  CreateShortStayDto, ShortStayQueryDto, ExtendShortStayDto, CheckOutShortStayDto, ConvertShortStayDto,
  CreateShortStayOfferDto, UpdateShortStayOfferDto,
} from './dto/short-stay.dto';

@ApiTags('short-stay')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'short-stay', version: '1' })
export class ShortStayController {
  constructor(private readonly service: ShortStayService) {}

  @Get('stats')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Get short stay pipeline stats' })
  getStats(@Query('propertyId') propertyId: string, @Request() req: any) {
    return this.service.getStats(req.user.tenantId, propertyId);
  }

  @Get('eligible-rooms')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Get rooms eligible for a new short stay booking' })
  getEligibleRooms(@Query('propertyId') propertyId: string, @Request() req: any) {
    return this.service.getEligibleRooms(propertyId, req.user.tenantId);
  }

  @Get('offers')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'List short stay offers for a property (super admin only)' })
  getOffers(@Query('propertyId') propertyId: string, @Request() req: any) {
    return this.service.getOffers(propertyId, req.user.tenantId);
  }

  @Post('offers')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a short stay offer and assign it to rooms (super admin only)' })
  createOffer(@Query('propertyId') propertyId: string, @Body() dto: CreateShortStayOfferDto, @Request() req: any) {
    return this.service.createOffer(propertyId, dto, req.user.tenantId);
  }

  @Put('offers/:id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Update a short stay offer, including its assigned rooms (super admin only)' })
  updateOffer(@Param('id') id: string, @Body() dto: UpdateShortStayOfferDto, @Request() req: any) {
    return this.service.updateOffer(id, dto, req.user.tenantId);
  }

  @Delete('offers/:id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete a short stay offer (super admin only)' })
  deleteOffer(@Param('id') id: string, @Request() req: any) {
    return this.service.deleteOffer(id, req.user.tenantId);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'List short stay bookings with search and filters' })
  findAll(@Query() query: ShortStayQueryDto, @Request() req: any) {
    return this.service.findAll(req.user.tenantId, query);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Get a single short stay booking' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.service.findOne(id, req.user.tenantId);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Log a new short stay booking (checks the guest in immediately)' })
  create(@Body() dto: CreateShortStayDto, @Request() req: any) {
    return this.service.create(dto, req.user.tenantId, req.user.sub);
  }

  @Post(':id/extend')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Add hours to an in-progress short stay' })
  extend(@Param('id') id: string, @Body() dto: ExtendShortStayDto, @Request() req: any) {
    return this.service.extend(id, dto.additionalHours, req.user.tenantId);
  }

  @Post(':id/checkout')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Check out a short stay booking, optionally collecting the remaining balance' })
  checkOut(@Param('id') id: string, @Body() dto: CheckOutShortStayDto, @Request() req: any) {
    return this.service.checkOut(id, dto, req.user.tenantId);
  }

  @Post(':id/cancel')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Cancel a short stay booking before checkout' })
  cancel(@Param('id') id: string, @Request() req: any) {
    return this.service.cancel(id, req.user.tenantId);
  }

  @Post(':id/prepare-upgrade')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Find-or-create the guest behind this short stay and return New Reservation seed values' })
  prepareUpgrade(@Param('id') id: string, @Request() req: any) {
    return this.service.prepareUpgrade(id, req.user.tenantId);
  }

  @Post(':id/upgrade')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Mark a short stay upgraded and link the resulting reservation' })
  upgrade(@Param('id') id: string, @Body() dto: ConvertShortStayDto, @Request() req: any) {
    return this.service.markUpgraded(id, dto.reservationId, req.user.tenantId);
  }
}
