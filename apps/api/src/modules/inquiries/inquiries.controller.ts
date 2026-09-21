import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { InquiriesService } from './inquiries.service';
import { CreateInquiryDto, UpdateInquiryDto, InquiryQueryDto, ConvertInquiryDto } from './dto/inquiries.dto';

@ApiTags('inquiries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'inquiries', version: '1' })
export class InquiriesController {
  constructor(private readonly service: InquiriesService) {}

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Get inquiry pipeline stats' })
  getStats(@Query('propertyId') propertyId: string, @Request() req: any) {
    return this.service.getStats(req.user.tenantId, propertyId);
  }

  @Get('types')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Get the built-in and previously-used custom inquiry categories' })
  getTypes(@Request() req: any) {
    return this.service.getTypes(req.user.tenantId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'List inquiries with search and filters' })
  findAll(@Query() query: InquiryQueryDto, @Request() req: any) {
    return this.service.findAll(req.user.tenantId, query);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Get a single inquiry' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.service.findOne(id, req.user.tenantId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Log a new customer inquiry' })
  create(@Body() dto: CreateInquiryDto, @Request() req: any) {
    return this.service.create(dto, req.user.tenantId, req.user.sub);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Update an inquiry (details, status, notes)' })
  update(@Param('id') id: string, @Body() dto: UpdateInquiryDto, @Request() req: any) {
    return this.service.update(id, dto, req.user.tenantId);
  }

  @Post(':id/prepare-conversion')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Find-or-create the guest behind this inquiry and return New Reservation seed values' })
  prepareConversion(@Param('id') id: string, @Request() req: any) {
    return this.service.prepareConversion(id, req.user.tenantId);
  }

  @Post(':id/convert')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Mark an inquiry converted and link the resulting reservation' })
  convert(@Param('id') id: string, @Body() dto: ConvertInquiryDto, @Request() req: any) {
    return this.service.markConverted(id, dto.reservationId, req.user.tenantId);
  }
}
