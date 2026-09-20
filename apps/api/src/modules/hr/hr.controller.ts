import { Controller, Get, Post, Patch, Put, Delete, Body, Param, Query, UseGuards, Request, HttpCode } from '@nestjs/common';
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

  // ─── DASHBOARD ───────────────────────────────────────────────

  @Get('dashboard')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getHRDashboard(@Query('propertyId') propertyId: string, @Request() req: any) {
    return this.service.getHRDashboardStats(propertyId, req.user.tenantId);
  }

  // ─── EMPLOYEES ───────────────────────────────────────────────

  @Get('employees')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getEmployees(@Query() query: any, @Request() req: any) {
    return this.service.getEmployees(query.propertyId, req.user.tenantId, query);
  }

  @Get('employees/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getEmployee(@Param('id') id: string, @Request() req: any) {
    return this.service.getEmployee(id, req.user.tenantId);
  }

  @Post('employees')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  createEmployee(@Body() dto: any, @Request() req: any) {
    return this.service.createEmployee(dto, req.user.tenantId);
  }

  @Patch('employees/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  updateEmployee(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.updateEmployee(id, dto, req.user.tenantId);
  }

  // ─── ATTENDANCE ──────────────────────────────────────────────

  @Post('attendance')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  recordAttendance(@Body() dto: any, @Request() req: any) {
    return this.service.recordAttendance(dto, req.user.tenantId);
  }

  @Get('attendance/report')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getAttendanceReport(@Query() query: any, @Request() req: any) {
    return this.service.getAttendanceReport(query.propertyId, req.user.tenantId, new Date(query.startDate), new Date(query.endDate));
  }

  @Get('attendance/anomalies')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getAnomalies(@Query() query: any, @Request() req: any) {
    return this.service.getAttendanceAnomalies(query.propertyId, req.user.tenantId, query);
  }

  @Post('attendance/anomalies')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  createAnomaly(@Body() dto: any, @Request() req: any) {
    return this.service.createAttendanceAnomaly(dto, req.user.tenantId);
  }

  @Patch('attendance/anomalies/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  updateAnomaly(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.updateAnomalyStatus(id, { ...dto, reviewedById: req.user.sub }, req.user.tenantId);
  }

  @Post('attendance/clock-in')
  clockIn(@Request() req: any) {
    return this.service.clockIn(req.user.sub);
  }

  @Post('attendance/clock-out')
  clockOut(@Request() req: any) {
    return this.service.clockOut(req.user.sub);
  }

  @Get('attendance/my')
  getMyAttendance(@Request() req: any, @Query() query: any) {
    return this.service.getMyAttendance(req.user.sub, query);
  }

  @Patch('attendance/:id/edit')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  editAttendance(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.editAttendance(id, dto, req.user.sub, req.user.tenantId);
  }

  // ─── LEAVE ───────────────────────────────────────────────────

  @Get('leave-requests')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getLeaveRequests(@Query() query: any, @Request() req: any) {
    return this.service.getLeaveRequests(query.propertyId, req.user.tenantId, query);
  }

  @Post('leave-requests')
  createLeaveRequest(@Body() dto: any, @Request() req: any) {
    return this.service.createLeaveRequest(dto, req.user.tenantId);
  }

  @Patch('leave-requests/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  approveLeave(@Param('id') id: string, @Request() req: any) {
    return this.service.approveLeave(id, req.user.sub, req.user.tenantId);
  }

  @Patch('leave-requests/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  rejectLeave(@Param('id') id: string, @Body() body: { reason: string }, @Request() req: any) {
    return this.service.rejectLeave(id, body.reason, req.user.tenantId);
  }

  @Get('leave-balances/:employeeId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getLeaveBalances(@Param('employeeId') employeeId: string, @Request() req: any) {
    return this.service.getLeaveBalances(employeeId, req.user.tenantId);
  }

  @Post('leave-balances')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  upsertLeaveBalance(@Body() dto: any, @Request() req: any) {
    return this.service.upsertLeaveBalance(dto, req.user.tenantId);
  }

  // ─── SHIFT / ROSTER ──────────────────────────────────────────

  @Get('roster')
  getRoster(@Query() query: any, @Request() req: any) {
    return this.service.getRoster(query.propertyId, req.user.tenantId, query);
  }

  @Post('roster')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  upsertShift(@Body() dto: any, @Request() req: any) {
    return this.service.upsertShift(dto, req.user.tenantId);
  }

  @Delete('roster/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  @HttpCode(200)
  deleteShift(@Param('id') id: string, @Request() req: any) {
    return this.service.deleteShift(id, req.user.tenantId);
  }

  // ─── SHIFT TYPE CONFIG ────────────────────────────────────────

  @Get('shift-types')
  getShiftTypes(@Query('propertyId') propertyId: string, @Request() req: any) {
    return this.service.getShiftTypes(propertyId, req.user.tenantId);
  }

  @Post('shift-types')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  createShiftType(@Body() dto: any, @Request() req: any) {
    return this.service.createShiftType(dto, req.user.tenantId);
  }

  @Put('shift-types/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  updateShiftType(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.updateShiftType(id, dto, req.user.tenantId);
  }

  @Delete('shift-types/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  @HttpCode(200)
  deleteShiftType(@Param('id') id: string, @Request() req: any) {
    return this.service.deleteShiftType(id, req.user.tenantId);
  }

  // ─── PAYROLL ─────────────────────────────────────────────────

  @Get('payroll')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  getPayrollHistory(@Query() query: any, @Request() req: any) {
    return this.service.getPayrollHistory(query.propertyId, req.user.tenantId, query);
  }

  @Post('payroll/run')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  runPayroll(@Body() body: any, @Request() req: any) {
    return this.service.runPayroll(body.propertyId, req.user.tenantId, new Date(body.periodStart), new Date(body.periodEnd));
  }

  @Patch('payroll/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  updatePayrollRecord(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.updatePayrollRecord(id, dto, req.user.tenantId);
  }

  @Patch('payroll/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  approvePayroll(@Param('id') id: string, @Request() req: any) {
    return this.service.approvePayrollRecord(id, req.user.tenantId);
  }

  @Patch('payroll/:id/mark-paid')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  markPayrollPaid(@Param('id') id: string, @Request() req: any) {
    return this.service.markPayrollPaid(id, req.user.tenantId);
  }

  @Get('payroll/summary')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  getPayrollSummary(@Query('propertyId') propertyId: string, @Query('period') period: string, @Request() req: any) {
    return this.service.getPayrollSummary(propertyId, req.user.tenantId, period);
  }

  // ─── PAYROLL DEDUCTIONS ──────────────────────────────────────

  @Get('payroll-deductions')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  getPayrollDeductions(@Query() query: any, @Request() req: any) {
    return this.service.getPayrollDeductions(query.propertyId, req.user.tenantId, query);
  }

  @Post('payroll-deductions')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  createPayrollDeduction(@Body() dto: any, @Request() req: any) {
    return this.service.createPayrollDeduction(dto, req.user.tenantId);
  }

  @Patch('payroll-deductions/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  approveDeduction(@Param('id') id: string, @Request() req: any) {
    return this.service.approvePayrollDeduction(id, req.user.sub, req.user.tenantId);
  }

  @Patch('payroll-deductions/:id/reverse')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  reverseDeduction(@Param('id') id: string, @Request() req: any) {
    return this.service.reversePayrollDeduction(id, req.user.tenantId);
  }

  // ─── DISCIPLINARY ────────────────────────────────────────────

  @Get('disciplinary')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getDisciplinaryCases(@Query() query: any, @Request() req: any) {
    return this.service.getDisciplinaryCases(query.propertyId, req.user.tenantId, query);
  }

  @Get('disciplinary/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getDisciplinaryCase(@Param('id') id: string, @Request() req: any) {
    return this.service.getDisciplinaryCase(id, req.user.tenantId);
  }

  @Post('disciplinary')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  createDisciplinaryCase(@Body() dto: any, @Request() req: any) {
    return this.service.createDisciplinaryCase({ ...dto, reportedById: req.user.sub }, req.user.tenantId);
  }

  @Patch('disciplinary/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  updateDisciplinaryCase(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.updateDisciplinaryCase(id, dto, req.user.tenantId);
  }

  @Post('disciplinary/:id/actions')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  addDisciplinaryAction(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.addDisciplinaryAction(id, { ...dto, issuedById: req.user.sub }, req.user.tenantId);
  }

  // ─── SUSPENSIONS ─────────────────────────────────────────────

  @Get('suspensions')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  getSuspensions(@Query() query: any, @Request() req: any) {
    return this.service.getSuspensions(query.propertyId, req.user.tenantId, query);
  }

  @Post('suspensions')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  createSuspension(@Body() dto: any, @Request() req: any) {
    return this.service.createSuspension({ ...dto, approvedById: req.user.sub }, req.user.tenantId);
  }

  @Patch('suspensions/:id/return')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  returnFromSuspension(@Param('id') id: string, @Body() body: { returnDate: string }, @Request() req: any) {
    return this.service.returnFromSuspension(id, body.returnDate, req.user.tenantId);
  }

  // ─── GRIEVANCES ──────────────────────────────────────────────

  @Get('grievances')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getGrievances(@Query() query: any, @Request() req: any) {
    return this.service.getGrievances(query.propertyId, req.user.tenantId, query);
  }

  @Post('grievances')
  createGrievance(@Body() dto: any, @Request() req: any) {
    return this.service.createGrievance(dto, req.user.tenantId);
  }

  @Patch('grievances/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  updateGrievance(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.updateGrievance(id, dto, req.user.tenantId);
  }

  // ─── STAFF LOANS ─────────────────────────────────────────────

  @Get('loans')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  getStaffLoans(@Query() query: any, @Request() req: any) {
    return this.service.getStaffLoans(query.propertyId, req.user.tenantId, query);
  }

  @Post('loans')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  createStaffLoan(@Body() dto: any, @Request() req: any) {
    return this.service.createStaffLoan(dto, req.user.tenantId);
  }

  @Patch('loans/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  approveStaffLoan(@Param('id') id: string, @Request() req: any) {
    return this.service.approveStaffLoan(id, req.user.sub, req.user.tenantId);
  }

  @Post('loans/:id/repayments')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  recordRepayment(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.recordLoanRepayment(id, dto, req.user.tenantId);
  }

  // ─── ASSET ISSUANCE ──────────────────────────────────────────

  @Get('assets')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getAssetIssues(@Query() query: any, @Request() req: any) {
    return this.service.getAssetIssues(query.propertyId, req.user.tenantId, query);
  }

  @Post('assets')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  issueAsset(@Body() dto: any, @Request() req: any) {
    return this.service.issueAsset(dto, req.user.tenantId);
  }

  @Patch('assets/:id/return')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  returnAsset(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.returnAsset(id, dto, req.user.tenantId);
  }

  // ─── PERFORMANCE REVIEWS ─────────────────────────────────────

  @Get('performance')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getPerformanceReviews(@Query() query: any, @Request() req: any) {
    return this.service.getPerformanceReviews(query.propertyId, req.user.tenantId, query);
  }

  @Post('performance')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  createPerformanceReview(@Body() dto: any, @Request() req: any) {
    return this.service.createPerformanceReview({ ...dto, reviewerId: req.user.sub }, req.user.tenantId);
  }

  @Patch('performance/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  updatePerformanceReview(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.updatePerformanceReview(id, dto, req.user.tenantId);
  }

  // ─── PROBATION ────────────────────────────────────────────────

  @Get('probation')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getProbationReviews(@Query() query: any, @Request() req: any) {
    return this.service.getProbationReviews(query.propertyId, req.user.tenantId, query);
  }

  @Post('probation')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  createProbationReview(@Body() dto: any, @Request() req: any) {
    return this.service.createProbationReview({ ...dto, reviewerId: req.user.sub }, req.user.tenantId);
  }

  @Patch('probation/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  updateProbationReview(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.updateProbationReview(id, dto, req.user.tenantId);
  }

  // ─── TRAINING ────────────────────────────────────────────────

  @Get('training/programs')
  getTrainingPrograms(@Query('propertyId') propertyId: string, @Request() req: any) {
    return this.service.getTrainingPrograms(propertyId, req.user.tenantId);
  }

  @Post('training/programs')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  createTrainingProgram(@Body() dto: any, @Request() req: any) {
    return this.service.createTrainingProgram(dto, req.user.tenantId);
  }

  @Get('training/attendances')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getTrainingAttendances(@Query() query: any, @Request() req: any) {
    return this.service.getTrainingAttendances(query.propertyId, req.user.tenantId, query);
  }

  @Post('training/attendances')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  recordTrainingAttendance(@Body() dto: any, @Request() req: any) {
    return this.service.recordTrainingAttendance(dto, req.user.tenantId);
  }

  @Patch('training/attendances/:id/complete')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  completeTraining(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.completeTraining(id, dto, req.user.tenantId);
  }

  // ─── RECRUITMENT ─────────────────────────────────────────────

  @Get('recruitment/openings')
  getJobOpenings(@Query() query: any, @Request() req: any) {
    return this.service.getJobOpenings(query.propertyId, req.user.tenantId, query);
  }

  @Post('recruitment/openings')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  createJobOpening(@Body() dto: any, @Request() req: any) {
    return this.service.createJobOpening(dto, req.user.tenantId);
  }

  @Patch('recruitment/openings/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  updateJobOpening(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.updateJobOpening(id, dto, req.user.tenantId);
  }

  @Get('recruitment/openings/:id/candidates')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  getCandidates(@Param('id') id: string, @Request() req: any) {
    return this.service.getCandidates(id, req.user.tenantId);
  }

  @Post('recruitment/openings/:id/candidates')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  createCandidate(@Param('id') jobOpeningId: string, @Body() dto: any, @Request() req: any) {
    return this.service.createCandidate({ ...dto, jobOpeningId }, req.user.tenantId);
  }

  @Patch('recruitment/candidates/:id/status')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  updateCandidateStatus(@Param('id') id: string, @Body() body: { status: string }, @Request() req: any) {
    return this.service.updateCandidateStatus(id, body.status, req.user.tenantId);
  }

  @Post('recruitment/candidates/:id/interview')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  scheduleInterview(@Param('id') candidateId: string, @Body() dto: any, @Request() req: any) {
    return this.service.scheduleInterview({ ...dto, candidateId, interviewerId: req.user.sub }, req.user.tenantId);
  }

  @Post('recruitment/candidates/:id/hire')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  convertToEmployee(@Param('id') candidateId: string, @Body() dto: any, @Request() req: any) {
    return this.service.convertCandidateToEmployee(candidateId, dto, req.user.tenantId);
  }

  // ─── ONBOARDING ──────────────────────────────────────────────

  @Get('onboarding/:employeeId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  getOnboarding(@Param('employeeId') employeeId: string, @Request() req: any) {
    return this.service.getOnboardingChecklist(employeeId, req.user.tenantId);
  }

  @Patch('onboarding/:employeeId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  updateOnboarding(@Param('employeeId') employeeId: string, @Body() dto: any, @Request() req: any) {
    return this.service.updateOnboardingChecklist(employeeId, dto, req.user.tenantId);
  }

  // ─── OFFBOARDING ─────────────────────────────────────────────

  @Get('offboarding')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  getOffboardingCases(@Query() query: any, @Request() req: any) {
    return this.service.getOffboardingCases(query.propertyId, req.user.tenantId);
  }

  @Post('offboarding')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  createOffboardingCase(@Body() dto: any, @Request() req: any) {
    return this.service.createOffboardingCase({ ...dto, processedById: req.user.sub }, req.user.tenantId);
  }

  @Patch('offboarding/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  updateOffboardingCase(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.updateOffboardingCase(id, dto, req.user.tenantId);
  }

  // ─── CASH HANDLING INCIDENTS ─────────────────────────────────

  @Get('cash-incidents')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getCashIncidents(@Query() query: any, @Request() req: any) {
    return this.service.getCashIncidents(query.propertyId, req.user.tenantId, query);
  }

  @Post('cash-incidents')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  createCashIncident(@Body() dto: any, @Request() req: any) {
    return this.service.createCashIncident({ ...dto, reportedById: req.user.sub }, req.user.tenantId);
  }

  @Patch('cash-incidents/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  updateCashIncident(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.updateCashIncident(id, dto, req.user.tenantId);
  }

  // ─── EMPLOYEE DOCUMENTS ───────────────────────────────────────

  @Get('employees/:employeeId/documents')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  getEmployeeDocuments(@Param('employeeId') employeeId: string, @Request() req: any) {
    return this.service.getEmployeeDocuments(employeeId, req.user.tenantId);
  }

  @Post('employees/:employeeId/documents')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  uploadDocument(@Param('employeeId') employeeId: string, @Body() dto: any, @Request() req: any) {
    return this.service.uploadEmployeeDocument({ ...dto, employeeId, uploadedById: req.user.sub }, req.user.tenantId);
  }

  @Delete('employees/:employeeId/documents/:docId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  @HttpCode(200)
  deleteDocument(@Param('docId') docId: string, @Request() req: any) {
    return this.service.deleteEmployeeDocument(docId, req.user.tenantId);
  }

  // ─── BENEFITS ─────────────────────────────────────────────────

  @Get('employees/:employeeId/benefits')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  getEmployeeBenefits(@Param('employeeId') employeeId: string, @Request() req: any) {
    return this.service.getEmployeeBenefits(employeeId, req.user.tenantId);
  }

  @Post('employees/:employeeId/benefits')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  createBenefit(@Param('employeeId') employeeId: string, @Body() dto: any, @Request() req: any) {
    return this.service.createEmployeeBenefit({ ...dto, employeeId }, req.user.tenantId);
  }

  @Patch('benefits/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  updateBenefit(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.updateEmployeeBenefit(id, dto, req.user.tenantId);
  }

  // ─── POLICY DOCUMENTS ─────────────────────────────────────────

  @Get('policies')
  getPolicies(@Query('propertyId') propertyId: string, @Request() req: any) {
    return this.service.getPolicies(propertyId, req.user.tenantId);
  }

  @Post('policies')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  createPolicy(@Body() dto: any, @Request() req: any) {
    return this.service.createPolicy(dto, req.user.tenantId);
  }

  @Post('policies/:id/acknowledge')
  acknowledgePolicy(@Param('id') policyId: string, @Body() body: { employeeId: string }, @Request() req: any) {
    return this.service.acknowledgePolicy(policyId, body.employeeId, req.user.tenantId);
  }

  // ─── EMPLOYEE INCIDENTS ───────────────────────────────────────

  @Get('incidents')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getEmployeeIncidents(@Query() query: any, @Request() req: any) {
    return this.service.getEmployeeIncidents(query.propertyId, req.user.tenantId, query);
  }

  @Post('incidents')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  createIncident(@Body() dto: any, @Request() req: any) {
    return this.service.createEmployeeIncident({ ...dto, reportedById: req.user.sub }, req.user.tenantId);
  }

  @Patch('incidents/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  updateIncident(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.updateEmployeeIncident(id, dto, req.user.tenantId);
  }

  // ─── HR APPROVALS ─────────────────────────────────────────────

  @Get('approvals')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  getApprovals(@Query() query: any, @Request() req: any) {
    return this.service.getHRApprovals(query.propertyId, req.user.tenantId, query);
  }

  @Post('approvals')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  createApproval(@Body() dto: any, @Request() req: any) {
    return this.service.createHRApproval({ ...dto, requestedById: req.user.sub }, req.user.tenantId);
  }

  @Patch('approvals/:id/decide')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  decideApproval(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.decideHRApproval(id, dto, req.user.tenantId);
  }

  // ─── REPORTS ─────────────────────────────────────────────────

  @Get('reports/headcount')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getHeadcount(@Query('propertyId') propertyId: string, @Request() req: any) {
    return this.service.getHeadcountByDepartment(propertyId, req.user.tenantId);
  }

  // ─── DEPARTMENTS ──────────────────────────────────────────────

  @Get('departments')
  getDepartments(@Request() req: any) {
    return this.service.getDepartments(req.user.tenantId);
  }
}
