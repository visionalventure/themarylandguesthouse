import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { HrService } from './hr.service';

@ApiTags('hr')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'hr', version: '1' })
export class HrController {
  constructor(private readonly service: HrService) {}

  @Get('employees')
  @ApiOperation({ summary: 'List employees' })
  getEmployees(@Query() query: any) {
    return this.service.getEmployees(query.propertyId, query);
  }

  @Get('employees/:id')
  @ApiOperation({ summary: 'Get employee details' })
  getEmployee(@Param('id') id: string) {
    return this.service.getEmployee(id);
  }

  @Post('employees')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: 'Create employee record' })
  createEmployee(@Body() dto: any) {
    return this.service.createEmployee(dto);
  }

  @Post('attendance')
  @ApiOperation({ summary: 'Record employee attendance' })
  recordAttendance(@Body() dto: any) {
    return this.service.recordAttendance(dto);
  }

  @Get('attendance/report')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  @ApiOperation({ summary: 'Get attendance report' })
  getAttendanceReport(@Query() query: any) {
    return this.service.getAttendanceReport(query.propertyId, new Date(query.startDate), new Date(query.endDate));
  }

  @Get('leave-requests')
  @ApiOperation({ summary: 'List leave requests' })
  getLeaveRequests(@Query() query: any) {
    return this.service.getLeaveRequests(query.propertyId, query);
  }

  @Post('leave-requests')
  @ApiOperation({ summary: 'Submit leave request' })
  createLeaveRequest(@Body() dto: any) {
    return this.service.createLeaveRequest(dto);
  }

  @Patch('leave-requests/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  @ApiOperation({ summary: 'Approve leave request' })
  approveLeave(@Param('id') id: string, @Request() req: any) {
    return this.service.approveLeave(id, req.user.sub);
  }

  @Patch('leave-requests/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  @ApiOperation({ summary: 'Reject leave request' })
  rejectLeave(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.service.rejectLeave(id, body.reason);
  }

  @Get('payroll')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: 'Get payroll history' })
  getPayrollHistory(@Query() query: any) {
    return this.service.getPayrollHistory(query.propertyId, query);
  }

  @Post('payroll/run')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: 'Run payroll for period' })
  runPayroll(@Body() body: any) {
    return this.service.runPayroll(body.propertyId, new Date(body.periodStart), new Date(body.periodEnd));
  }

  @Get('departments')
  @ApiOperation({ summary: 'Get departments' })
  getDepartments(@Request() req: any) {
    return this.service.getDepartments(req.user.tenantId);
  }
}
