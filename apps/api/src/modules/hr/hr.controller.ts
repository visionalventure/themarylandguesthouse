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
  getHRDashboard(@Query('propertyId') propertyId: string) {
    return this.service.getHRDashboardStats(propertyId);
  }

  // ─── EMPLOYEES ───────────────────────────────────────────────

  @Get('employees')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getEmployees(@Query() query: any) {
    return this.service.getEmployees(query.propertyId, query);
  }

  @Get('employees/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getEmployee(@Param('id') id: string) {
    return this.service.getEmployee(id);
  }

  @Post('employees')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  createEmployee(@Body() dto: any) {
    return this.service.createEmployee(dto);
  }

  @Patch('employees/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  updateEmployee(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateEmployee(id, dto);
  }

  // ─── ATTENDANCE ──────────────────────────────────────────────

  @Post('attendance')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  recordAttendance(@Body() dto: any) {
    return this.service.recordAttendance(dto);
  }

  @Get('attendance/report')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getAttendanceReport(@Query() query: any) {
    return this.service.getAttendanceReport(query.propertyId, new Date(query.startDate), new Date(query.endDate));
  }

  @Get('attendance/anomalies')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getAnomalies(@Query() query: any) {
    return this.service.getAttendanceAnomalies(query.propertyId, query);
  }

  @Post('attendance/anomalies')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  createAnomaly(@Body() dto: any) {
    return this.service.createAttendanceAnomaly(dto);
  }

  @Patch('attendance/anomalies/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  updateAnomaly(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.updateAnomalyStatus(id, { ...dto, reviewedById: req.user.sub });
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
    return this.service.editAttendance(id, dto, req.user.sub);
  }

  // ─── LEAVE ───────────────────────────────────────────────────

  @Get('leave-requests')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getLeaveRequests(@Query() query: any) {
    return this.service.getLeaveRequests(query.propertyId, query);
  }

  @Post('leave-requests')
  createLeaveRequest(@Body() dto: any) {
    return this.service.createLeaveRequest(dto);
  }

  @Patch('leave-requests/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  approveLeave(@Param('id') id: string, @Request() req: any) {
    return this.service.approveLeave(id, req.user.sub);
  }

  @Patch('leave-requests/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  rejectLeave(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.service.rejectLeave(id, body.reason);
  }

  @Get('leave-balances/:employeeId')
  getLeaveBalances(@Param('employeeId') employeeId: string) {
    return this.service.getLeaveBalances(employeeId);
  }

  @Post('leave-balances')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  upsertLeaveBalance(@Body() dto: any) {
    return this.service.upsertLeaveBalance(dto);
  }

  // ─── SHIFT / ROSTER ──────────────────────────────────────────

  @Get('roster')
  getRoster(@Query() query: any) {
    return this.service.getRoster(query.propertyId, query);
  }

  @Post('roster')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  upsertShift(@Body() dto: any) {
    return this.service.upsertShift(dto);
  }

  @Delete('roster/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  @HttpCode(200)
  deleteShift(@Param('id') id: string) {
    return this.service.deleteShift(id);
  }

  // ─── SHIFT TYPE CONFIG ────────────────────────────────────────

  @Get('shift-types')
  getShiftTypes(@Query('propertyId') propertyId: string) {
    return this.service.getShiftTypes(propertyId);
  }

  @Post('shift-types')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  createShiftType(@Body() dto: any) {
    return this.service.createShiftType(dto);
  }

  @Put('shift-types/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  updateShiftType(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateShiftType(id, dto);
  }

  @Delete('shift-types/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  @HttpCode(200)
  deleteShiftType(@Param('id') id: string) {
    return this.service.deleteShiftType(id);
  }

  // ─── PAYROLL ─────────────────────────────────────────────────

  @Get('payroll')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  getPayrollHistory(@Query() query: any) {
    return this.service.getPayrollHistory(query.propertyId, query);
  }

  @Post('payroll/run')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  runPayroll(@Body() body: any) {
    return this.service.runPayroll(body.propertyId, new Date(body.periodStart), new Date(body.periodEnd));
  }

  @Patch('payroll/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  updatePayrollRecord(@Param('id') id: string, @Body() dto: any) {
    return this.service.updatePayrollRecord(id, dto);
  }

  @Patch('payroll/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  approvePayroll(@Param('id') id: string) {
    return this.service.approvePayrollRecord(id);
  }

  @Patch('payroll/:id/mark-paid')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  markPayrollPaid(@Param('id') id: string) {
    return this.service.markPayrollPaid(id);
  }

  @Get('payroll/summary')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  getPayrollSummary(@Query('propertyId') propertyId: string, @Query('period') period: string) {
    return this.service.getPayrollSummary(propertyId, period);
  }

  // ─── PAYROLL DEDUCTIONS ──────────────────────────────────────

  @Get('payroll-deductions')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  getPayrollDeductions(@Query() query: any) {
    return this.service.getPayrollDeductions(query.propertyId, query);
  }

  @Post('payroll-deductions')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  createPayrollDeduction(@Body() dto: any) {
    return this.service.createPayrollDeduction(dto);
  }

  @Patch('payroll-deductions/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  approveDeduction(@Param('id') id: string, @Request() req: any) {
    return this.service.approvePayrollDeduction(id, req.user.sub);
  }

  @Patch('payroll-deductions/:id/reverse')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  reverseDeduction(@Param('id') id: string) {
    return this.service.reversePayrollDeduction(id);
  }

  // ─── DISCIPLINARY ────────────────────────────────────────────

  @Get('disciplinary')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getDisciplinaryCases(@Query() query: any) {
    return this.service.getDisciplinaryCases(query.propertyId, query);
  }

  @Get('disciplinary/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getDisciplinaryCase(@Param('id') id: string) {
    return this.service.getDisciplinaryCase(id);
  }

  @Post('disciplinary')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  createDisciplinaryCase(@Body() dto: any, @Request() req: any) {
    return this.service.createDisciplinaryCase({ ...dto, reportedById: req.user.sub });
  }

  @Patch('disciplinary/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  updateDisciplinaryCase(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateDisciplinaryCase(id, dto);
  }

  @Post('disciplinary/:id/actions')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  addDisciplinaryAction(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.addDisciplinaryAction(id, { ...dto, issuedById: req.user.sub });
  }

  // ─── SUSPENSIONS ─────────────────────────────────────────────

  @Get('suspensions')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  getSuspensions(@Query() query: any) {
    return this.service.getSuspensions(query.propertyId, query);
  }

  @Post('suspensions')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  createSuspension(@Body() dto: any, @Request() req: any) {
    return this.service.createSuspension({ ...dto, approvedById: req.user.sub });
  }

  @Patch('suspensions/:id/return')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  returnFromSuspension(@Param('id') id: string, @Body() body: { returnDate: string }) {
    return this.service.returnFromSuspension(id, body.returnDate);
  }

  // ─── GRIEVANCES ──────────────────────────────────────────────

  @Get('grievances')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getGrievances(@Query() query: any) {
    return this.service.getGrievances(query.propertyId, query);
  }

  @Post('grievances')
  createGrievance(@Body() dto: any) {
    return this.service.createGrievance(dto);
  }

  @Patch('grievances/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  updateGrievance(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateGrievance(id, dto);
  }

  // ─── STAFF LOANS ─────────────────────────────────────────────

  @Get('loans')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  getStaffLoans(@Query() query: any) {
    return this.service.getStaffLoans(query.propertyId, query);
  }

  @Post('loans')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  createStaffLoan(@Body() dto: any) {
    return this.service.createStaffLoan(dto);
  }

  @Patch('loans/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  approveStaffLoan(@Param('id') id: string, @Request() req: any) {
    return this.service.approveStaffLoan(id, req.user.sub);
  }

  @Post('loans/:id/repayments')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  recordRepayment(@Param('id') id: string, @Body() dto: any) {
    return this.service.recordLoanRepayment(id, dto);
  }

  // ─── ASSET ISSUANCE ──────────────────────────────────────────

  @Get('assets')
  getAssetIssues(@Query() query: any) {
    return this.service.getAssetIssues(query.propertyId, query);
  }

  @Post('assets')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  issueAsset(@Body() dto: any) {
    return this.service.issueAsset(dto);
  }

  @Patch('assets/:id/return')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  returnAsset(@Param('id') id: string, @Body() dto: any) {
    return this.service.returnAsset(id, dto);
  }

  // ─── PERFORMANCE REVIEWS ─────────────────────────────────────

  @Get('performance')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getPerformanceReviews(@Query() query: any) {
    return this.service.getPerformanceReviews(query.propertyId, query);
  }

  @Post('performance')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  createPerformanceReview(@Body() dto: any, @Request() req: any) {
    return this.service.createPerformanceReview({ ...dto, reviewerId: req.user.sub });
  }

  @Patch('performance/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  updatePerformanceReview(@Param('id') id: string, @Body() dto: any) {
    return this.service.updatePerformanceReview(id, dto);
  }

  // ─── PROBATION ────────────────────────────────────────────────

  @Get('probation')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getProbationReviews(@Query() query: any) {
    return this.service.getProbationReviews(query.propertyId, query);
  }

  @Post('probation')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  createProbationReview(@Body() dto: any, @Request() req: any) {
    return this.service.createProbationReview({ ...dto, reviewerId: req.user.sub });
  }

  @Patch('probation/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  updateProbationReview(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateProbationReview(id, dto);
  }

  // ─── TRAINING ────────────────────────────────────────────────

  @Get('training/programs')
  getTrainingPrograms(@Query('propertyId') propertyId: string) {
    return this.service.getTrainingPrograms(propertyId);
  }

  @Post('training/programs')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  createTrainingProgram(@Body() dto: any) {
    return this.service.createTrainingProgram(dto);
  }

  @Get('training/attendances')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getTrainingAttendances(@Query() query: any) {
    return this.service.getTrainingAttendances(query.propertyId, query);
  }

  @Post('training/attendances')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  recordTrainingAttendance(@Body() dto: any) {
    return this.service.recordTrainingAttendance(dto);
  }

  @Patch('training/attendances/:id/complete')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  completeTraining(@Param('id') id: string, @Body() dto: any) {
    return this.service.completeTraining(id, dto);
  }

  // ─── RECRUITMENT ─────────────────────────────────────────────

  @Get('recruitment/openings')
  getJobOpenings(@Query() query: any) {
    return this.service.getJobOpenings(query.propertyId, query);
  }

  @Post('recruitment/openings')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  createJobOpening(@Body() dto: any) {
    return this.service.createJobOpening(dto);
  }

  @Patch('recruitment/openings/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  updateJobOpening(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateJobOpening(id, dto);
  }

  @Get('recruitment/openings/:id/candidates')
  getCandidates(@Param('id') id: string) {
    return this.service.getCandidates(id);
  }

  @Post('recruitment/openings/:id/candidates')
  createCandidate(@Param('id') jobOpeningId: string, @Body() dto: any) {
    return this.service.createCandidate({ ...dto, jobOpeningId });
  }

  @Patch('recruitment/candidates/:id/status')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  updateCandidateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.service.updateCandidateStatus(id, body.status);
  }

  @Post('recruitment/candidates/:id/interview')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  scheduleInterview(@Param('id') candidateId: string, @Body() dto: any, @Request() req: any) {
    return this.service.scheduleInterview({ ...dto, candidateId, interviewerId: req.user.sub });
  }

  @Post('recruitment/candidates/:id/hire')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  convertToEmployee(@Param('id') candidateId: string, @Body() dto: any) {
    return this.service.convertCandidateToEmployee(candidateId, dto);
  }

  // ─── ONBOARDING ──────────────────────────────────────────────

  @Get('onboarding/:employeeId')
  getOnboarding(@Param('employeeId') employeeId: string) {
    return this.service.getOnboardingChecklist(employeeId);
  }

  @Patch('onboarding/:employeeId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  updateOnboarding(@Param('employeeId') employeeId: string, @Body() dto: any) {
    return this.service.updateOnboardingChecklist(employeeId, dto);
  }

  // ─── OFFBOARDING ─────────────────────────────────────────────

  @Get('offboarding')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  getOffboardingCases(@Query() query: any) {
    return this.service.getOffboardingCases(query.propertyId);
  }

  @Post('offboarding')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  createOffboardingCase(@Body() dto: any, @Request() req: any) {
    return this.service.createOffboardingCase({ ...dto, processedById: req.user.sub });
  }

  @Patch('offboarding/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  updateOffboardingCase(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateOffboardingCase(id, dto);
  }

  // ─── CASH HANDLING INCIDENTS ─────────────────────────────────

  @Get('cash-incidents')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getCashIncidents(@Query() query: any) {
    return this.service.getCashIncidents(query.propertyId, query);
  }

  @Post('cash-incidents')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  createCashIncident(@Body() dto: any, @Request() req: any) {
    return this.service.createCashIncident({ ...dto, reportedById: req.user.sub });
  }

  @Patch('cash-incidents/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  updateCashIncident(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateCashIncident(id, dto);
  }

  // ─── EMPLOYEE DOCUMENTS ───────────────────────────────────────

  @Get('employees/:employeeId/documents')
  getEmployeeDocuments(@Param('employeeId') employeeId: string) {
    return this.service.getEmployeeDocuments(employeeId);
  }

  @Post('employees/:employeeId/documents')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  uploadDocument(@Param('employeeId') employeeId: string, @Body() dto: any, @Request() req: any) {
    return this.service.uploadEmployeeDocument({ ...dto, employeeId, uploadedById: req.user.sub });
  }

  @Delete('employees/:employeeId/documents/:docId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  @HttpCode(200)
  deleteDocument(@Param('docId') docId: string) {
    return this.service.deleteEmployeeDocument(docId);
  }

  // ─── BENEFITS ─────────────────────────────────────────────────

  @Get('employees/:employeeId/benefits')
  getEmployeeBenefits(@Param('employeeId') employeeId: string) {
    return this.service.getEmployeeBenefits(employeeId);
  }

  @Post('employees/:employeeId/benefits')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  createBenefit(@Param('employeeId') employeeId: string, @Body() dto: any) {
    return this.service.createEmployeeBenefit({ ...dto, employeeId });
  }

  @Patch('benefits/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  updateBenefit(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateEmployeeBenefit(id, dto);
  }

  // ─── POLICY DOCUMENTS ─────────────────────────────────────────

  @Get('policies')
  getPolicies(@Query('propertyId') propertyId: string) {
    return this.service.getPolicies(propertyId);
  }

  @Post('policies')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  createPolicy(@Body() dto: any) {
    return this.service.createPolicy(dto);
  }

  @Post('policies/:id/acknowledge')
  acknowledgePolicy(@Param('id') policyId: string, @Body() body: { employeeId: string }) {
    return this.service.acknowledgePolicy(policyId, body.employeeId);
  }

  // ─── EMPLOYEE INCIDENTS ───────────────────────────────────────

  @Get('incidents')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getEmployeeIncidents(@Query() query: any) {
    return this.service.getEmployeeIncidents(query.propertyId, query);
  }

  @Post('incidents')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  createIncident(@Body() dto: any, @Request() req: any) {
    return this.service.createEmployeeIncident({ ...dto, reportedById: req.user.sub });
  }

  @Patch('incidents/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  updateIncident(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateEmployeeIncident(id, dto);
  }

  // ─── HR APPROVALS ─────────────────────────────────────────────

  @Get('approvals')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  getApprovals(@Query() query: any) {
    return this.service.getHRApprovals(query.propertyId, query);
  }

  @Post('approvals')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER')
  createApproval(@Body() dto: any, @Request() req: any) {
    return this.service.createHRApproval({ ...dto, requestedById: req.user.sub });
  }

  @Patch('approvals/:id/decide')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  decideApproval(@Param('id') id: string, @Body() dto: any) {
    return this.service.decideHRApproval(id, dto);
  }

  // ─── REPORTS ─────────────────────────────────────────────────

  @Get('reports/headcount')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER')
  getHeadcount(@Query('propertyId') propertyId: string) {
    return this.service.getHeadcountByDepartment(propertyId);
  }

  // ─── DEPARTMENTS ──────────────────────────────────────────────

  @Get('departments')
  getDepartments(@Request() req: any) {
    return this.service.getDepartments(req.user.tenantId);
  }
}
