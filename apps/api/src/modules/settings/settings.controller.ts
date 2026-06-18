import { Controller, Get, Put, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'settings', version: '1' })
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get('property')
  @ApiOperation({ summary: 'Get property settings' })
  getProperty(@Query('propertyId') propertyId: string) {
    return this.service.getProperty(propertyId);
  }

  @Put('property')
  @ApiOperation({ summary: 'Update property settings' })
  updateProperty(@Query('propertyId') propertyId: string, @Body() dto: any) {
    return this.service.updateProperty(propertyId, dto);
  }

  @Get('users')
  @ApiOperation({ summary: 'List users for tenant' })
  getUsers(@Query('tenantId') tenantId: string) {
    return this.service.getUsers(tenantId);
  }

  @Post('users/invite')
  @ApiOperation({ summary: 'Invite a new user' })
  inviteUser(@Body() dto: any) {
    return this.service.inviteUser(dto);
  }

  @Put('users/:id/role')
  @ApiOperation({ summary: 'Update user role' })
  updateUserRole(@Param('id') id: string, @Body('role') role: string) {
    return this.service.updateUserRole(id, role);
  }

  @Get('tax-rates')
  @ApiOperation({ summary: 'List tax rates' })
  getTaxRates(@Query('propertyId') propertyId: string) {
    return this.service.getTaxRates(propertyId);
  }

  @Post('tax-rates')
  @ApiOperation({ summary: 'Create tax rate' })
  createTaxRate(@Body() dto: any) {
    return this.service.createTaxRate(dto);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get own profile' })
  getProfile(@Request() req: any) {
    return this.service.getProfile(req.user.sub);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update own profile' })
  updateProfile(@Request() req: any, @Body() dto: any) {
    return this.service.updateProfile(req.user.sub, dto);
  }

  @Get('audit-log')
  @ApiOperation({ summary: 'Get audit log entries' })
  getAuditLog(@Request() req: any, @Query() query: any) {
    return this.service.getAuditLog(req.user.tenantId, query);
  }
}
