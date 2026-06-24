import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ReservationsService } from './reservations.service';

@ApiTags('reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'reservations', version: '1' })
export class ReservationsController {
  constructor(private readonly service: ReservationsService) {}

  @Get()
  @ApiOperation({ summary: 'List reservations with filters' })
  findAll(@Query() query: any, @Request() req: any) {
    return this.service.findAll(query.propertyId, req.user.tenantId, query);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get reservations for calendar view' })
  getCalendar(@Query() query: any) {
    return this.service.getCalendar(query.propertyId, new Date(query.startDate), new Date(query.endDate));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reservation details' })
  findOne(@Param('id') id: string, @Query('propertyId') propertyId: string) {
    return this.service.findOne(id, propertyId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Create new reservation' })
  create(@Body() dto: any, @Request() req: any) {
    return this.service.create(dto, req.user.sub);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Update reservation' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Patch(':id/check-in')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Check in guest' })
  checkIn(@Param('id') id: string) {
    return this.service.checkIn(id);
  }

  @Patch(':id/check-out')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Check out guest (triggers housekeeping)' })
  checkOut(@Param('id') id: string) {
    return this.service.checkOut(id);
  }

  @Patch(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Cancel reservation' })
  cancel(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.service.cancel(id, body.reason);
  }

  @Post('hold')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Place a temporary hold on a room' })
  holdRoom(@Body() dto: any, @Request() req: any) {
    return this.service.holdRoom(dto, req.user.sub);
  }

  @Post('release-holds')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Release all expired holds (called automatically before availability check)' })
  releaseExpiredHolds() {
    return this.service.releaseExpiredHolds();
  }
}
