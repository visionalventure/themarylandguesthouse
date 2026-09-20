import { Controller, Get, Put, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SettingsService } from './settings.service';
import {
  UpdatePropertyDto,
  InviteUserDto,
  UpdateRoleDto,
  UpdateUserNameDto,
  UpdateUserEmailDto,
  CreateTaxRateDto,
  UpdatePolicyConfigDto,
  UpdateEmailConfigDto,
  SendTestEmailDto,
  UpdateProfileDto,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  AuditLogQueryDto,
} from './dto/settings.dto';

@ApiTags('settings')
@ApiBearerAuth()
@Controller({ path: 'settings', version: '1' })
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get('property')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get property settings — resolves by tenantId when propertyId is omitted' })
  getProperty(@Query('propertyId') propertyId: string, @Request() req: any) {
    return this.service.getProperty(propertyId || undefined, req.user.tenantId);
  }

  @Put('property')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update property settings' })
  updateProperty(@Query('propertyId') propertyId: string, @Body() dto: UpdatePropertyDto, @Request() req: any) {
    return this.service.updateProperty(propertyId, dto, req.user.tenantId);
  }

  @Get('users')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'List users for own tenant' })
  getUsers(@Request() req: any) {
    return this.service.getUsers(req.user.tenantId);
  }

  @Post('users/invite')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Invite a new user' })
  inviteUser(@Body() dto: InviteUserDto, @Request() req: any) {
    return this.service.inviteUser(dto, req.user.tenantId, req.user.role);
  }

  @Put('users/:id/role')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Update user role' })
  updateUserRole(@Param('id') id: string, @Body() dto: UpdateRoleDto, @Request() req: any) {
    return this.service.updateUserRole(id, dto.role, req.user.role, req.user.tenantId);
  }

  @Put('users/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Update user name fields' })
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserNameDto, @Request() req: any) {
    return this.service.updateUser(id, dto, req.user.role, req.user.tenantId);
  }

  @Put('users/:id/email')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Update user email' })
  updateUserEmail(@Param('id') id: string, @Body() dto: UpdateUserEmailDto, @Request() req: any) {
    return this.service.updateUserEmail(id, dto.email, req.user.role, req.user.tenantId);
  }

  @Post('users/:id/reset-password')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Admin reset user password — returns one-time temporary password' })
  resetUserPassword(@Param('id') id: string, @Request() req: any) {
    return this.service.resetUserPassword(id, req.user.role, req.user.tenantId);
  }

  @Patch('users/:id/active')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Toggle user active status' })
  toggleUserActive(@Param('id') id: string, @Request() req: any) {
    return this.service.toggleUserActive(id, req.user.role, req.user.sub, req.user.tenantId);
  }

  @Get('tax-rates')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'FRONT_DESK')
  @ApiOperation({ summary: 'List tax rates' })
  getTaxRates(@Request() req: any) {
    return this.service.getTaxRates(req.user.tenantId);
  }

  @Post('tax-rates')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create tax rate' })
  createTaxRate(@Body() dto: CreateTaxRateDto, @Request() req: any) {
    return this.service.createTaxRate(dto, req.user.tenantId);
  }

  @Get('policy')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get merged property policy config with defaults' })
  getPolicyConfig(@Query('propertyId') propertyId: string, @Request() req: any) {
    return this.service.getPolicyConfig(propertyId, req.user.tenantId);
  }

  @Put('policy')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update property policy config (deep-merged, whitelisted sections only)' })
  updatePolicyConfig(@Query('propertyId') propertyId: string, @Body() dto: UpdatePolicyConfigDto, @Request() req: any) {
    return this.service.updatePolicyConfig(propertyId, dto, req.user.tenantId);
  }

  @Get('email')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get email configuration for property' })
  getEmailConfig(@Query('propertyId') propertyId: string, @Request() req: any) {
    return this.service.getEmailConfig(propertyId, req.user.tenantId);
  }

  @Put('email')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Update email sender configuration' })
  updateEmailConfig(@Query('propertyId') propertyId: string, @Body() dto: UpdateEmailConfigDto, @Request() req: any) {
    return this.service.updateEmailConfig(propertyId, dto, req.user.tenantId);
  }

  @Post('email/test')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Send a test email using current configuration' })
  sendTestEmail(@Query('propertyId') propertyId: string, @Body() dto: SendTestEmailDto, @Request() req: any) {
    return this.service.sendTestEmail(propertyId, dto.to, req.user.tenantId);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get own profile' })
  getProfile(@Request() req: any) {
    return this.service.getProfile(req.user.sub);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update own profile' })
  updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.service.updateProfile(req.user.sub, dto);
  }

  @Get('audit-log')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Get audit log entries' })
  getAuditLog(@Request() req: any, @Query() query: AuditLogQueryDto) {
    return this.service.getAuditLog(req.user.tenantId, query);
  }

  @Get('departments')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'List departments for tenant' })
  getDepartments(@Request() req: any) {
    return this.service.getDepartments(req.user.tenantId);
  }

  @Post('departments')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a new department' })
  createDepartment(@Request() req: any, @Body() dto: CreateDepartmentDto) {
    return this.service.createDepartment({ ...dto, tenantId: req.user.tenantId });
  }

  @Put('departments/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Update a department' })
  updateDepartment(@Param('id') id: string, @Body() dto: UpdateDepartmentDto, @Request() req: any) {
    return this.service.updateDepartment(id, dto, req.user.tenantId);
  }
}
