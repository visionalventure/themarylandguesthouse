import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PropertiesService } from './properties.service';

@ApiTags('properties')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'properties', version: '1' })
export class PropertiesController {
  constructor(private readonly service: PropertiesService) {}

  @Get()
  @ApiOperation({ summary: 'List all properties for tenant' })
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get property details' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new property' })
  create(@Body() dto: any, @Request() req: any) {
    return this.service.create({ ...dto, tenantId: req.user.tenantId });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update property' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }
}
