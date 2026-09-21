import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ShortStayService } from './short-stay.service';
import { CreateShortStayDto, ShortStayQueryDto } from './dto/short-stay.dto';

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

  @Post(':id/checkout')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Check out a short stay booking' })
  checkOut(@Param('id') id: string, @Request() req: any) {
    return this.service.checkOut(id, req.user.tenantId);
  }

  @Post(':id/cancel')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Cancel a short stay booking before checkout' })
  cancel(@Param('id') id: string, @Request() req: any) {
    return this.service.cancel(id, req.user.tenantId);
  }
}
