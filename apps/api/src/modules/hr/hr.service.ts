import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class HrService {
  constructor(private prisma: PrismaService) {}

  // ─── EMPLOYEES ────────────────────────────────────────────────

  async getEmployees(propertyId: string, query: any = {}) {
    const { search, departmentId, status, page = 1, limit = 20 } = query;
    const where: any = { propertyId };
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { employeeNumber: { contains: search, mode: 'insensitive' } },
        { position: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where, skip: (Number(page) - 1) * Number(limit), take: Number(limit),
        include: { department: true, supervisor: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { firstName: 'asc' },
      }),
      this.prisma.employee.count({ where }),
    ]);
    return { data, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) };
  }

  async getEmployee(id: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        supervisor: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
        attendances: { take: 30, orderBy: { date: 'desc' } },
        leaveRequests: { take: 10, orderBy: { createdAt: 'desc' } },
        payrolls: { take: 6, orderBy: { periodStart: 'desc' } },
        performanceReviews: { take: 5, orderBy: { createdAt: 'desc' } },
        probationReviews: { orderBy: { scheduledDate: 'desc' } },
        disciplinaryCases: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { actions: true },
        },
        suspensions: { take: 5, orderBy: { startDate: 'desc' } },
        staffLoans: { where: { status: { not: 'REJECTED' } }, orderBy: { createdAt: 'desc' } },
        assetIssues: { where: { status: 'ISSUED' }, orderBy: { issuedDate: 'desc' } },
        benefits: { where: { isActive: true } },
        employeeDocuments: { orderBy: { createdAt: 'desc' } },
        onboardingChecklist: true,
        attendanceAnomalies: { take: 10, orderBy: { date: 'desc' } },
      },
    });
    if (!emp) throw new NotFoundException('Employee not found');
    return emp;
  }

  async createEmployee(dto: any) {
    const count = await this.prisma.employee.count({ where: { propertyId: dto.propertyId } });
    const employeeNumber = `EMP-${(count + 1).toString().padStart(4, '0')}`;
    const employee = await this.prisma.employee.create({
      data: { ...dto, employeeNumber },
      include: { department: true },
    });
    // Auto-create onboarding checklist
    await this.prisma.onboardingChecklist.create({ data: { employeeId: employee.id } }).catch(() => null);
    return employee;
  }

  async updateEmployee(id: string, dto: any) {
    const allowed = [
      'firstName','lastName','preferredName','email','phone','nationalId','taxId',
      'dateOfBirth','gender','nationality','address','emergencyContact','emergencyPhone',
      'nextOfKin','nextOfKinPhone','position','employmentType','departmentId','supervisorId',
      'baseSalary','bankName','bankAccount','bankBranch','mobileMoney',
      'contractEndDate','probationStartDate','probationEndDate','status','notes','avatarUrl',
    ];
    const data: any = {};
    for (const key of allowed) { if (key in dto) data[key] = dto[key]; }
    return this.prisma.employee.update({ where: { id }, data, include: { department: true } });
  }

  // ─── ATTENDANCE ────────────────────────────────────────────────

  async recordAttendance(dto: any) {
    return this.prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: dto.employeeId, date: new Date(dto.date) } },
      create: { ...dto, date: new Date(dto.date) },
      update: { clockOut: dto.clockOut, hoursWorked: dto.hoursWorked, status: dto.status, notes: dto.notes },
    });
  }

  async getAttendanceReport(propertyId: string, startDate: Date, endDate: Date) {
    return this.prisma.attendance.findMany({
      where: { date: { gte: startDate, lte: endDate }, employee: { propertyId } },
      include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true, departmentId: true, department: { select: { name: true } } } } },
      orderBy: { date: 'desc' },
    });
  }

  async getAttendanceAnomalies(propertyId: string, query: any = {}) {
    const { status, employeeId, page = 1, limit = 30 } = query;
    const where: any = { employee: { propertyId } };
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;
    const [data, total] = await Promise.all([
      this.prisma.attendanceAnomaly.findMany({
        where, skip: (Number(page) - 1) * Number(limit), take: Number(limit),
        include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
        orderBy: { date: 'desc' },
      }),
      this.prisma.attendanceAnomaly.count({ where }),
    ]);
    return { data, total };
  }

  async createAttendanceAnomaly(dto: any) {
    return this.prisma.attendanceAnomaly.create({ data: { ...dto, date: new Date(dto.date) } });
  }

  async updateAnomalyStatus(id: string, dto: { status: string; reviewNotes?: string; reviewedById?: string }) {
    return this.prisma.attendanceAnomaly.update({ where: { id }, data: dto });
  }

  // ─── LEAVE ────────────────────────────────────────────────────

  async getLeaveRequests(propertyId: string, query: any = {}) {
    const { status, employeeId, page = 1, limit = 50 } = query;
    const where: any = { employee: { propertyId } };
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;
    const [data, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit), take: Number(limit),
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);
    return { data, total };
  }

  async createLeaveRequest(dto: any) {
    return this.prisma.leaveRequest.create({ data: dto });
  }

  async approveLeave(id: string, approvedById: string) {
    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: 'APPROVED', approvedById, approvedAt: new Date() },
    });
  }

  async rejectLeave(id: string, reason: string) {
    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: 'REJECTED', rejectionNote: reason },
    });
  }

  async getLeaveBalances(employeeId: string) {
    return this.prisma.leaveBalance.findMany({ where: { employeeId }, orderBy: { leaveType: 'asc' } });
  }

  async upsertLeaveBalance(dto: { employeeId: string; year: number; leaveType: any; entitled: number }) {
    return this.prisma.leaveBalance.upsert({
      where: { employeeId_year_leaveType: { employeeId: dto.employeeId, year: dto.year, leaveType: dto.leaveType } },
      update: { entitled: dto.entitled, remaining: dto.entitled },
      create: { ...dto, taken: 0, remaining: dto.entitled },
    });
  }

  // ─── SHIFT / ROSTER ────────────────────────────────────────────

  async getRoster(propertyId: string, query: any = {}) {
    const { startDate, endDate, departmentId, employeeId } = query;
    const where: any = { propertyId };
    if (startDate && endDate) where.shiftDate = { gte: new Date(startDate), lte: new Date(endDate) };
    if (employeeId) where.employeeId = employeeId;
    if (departmentId) where.employee = { departmentId };
    return this.prisma.shiftRoster.findMany({
      where,
      include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true, departmentId: true } } },
      orderBy: [{ shiftDate: 'asc' }, { startTime: 'asc' }],
    });
  }

  async upsertShift(dto: any) {
    return this.prisma.shiftRoster.upsert({
      where: { employeeId_shiftDate: { employeeId: dto.employeeId, shiftDate: new Date(dto.shiftDate) } },
      create: { ...dto, shiftDate: new Date(dto.shiftDate) },
      update: { shiftType: dto.shiftType, startTime: dto.startTime, endTime: dto.endTime, notes: dto.notes, isConfirmed: dto.isConfirmed },
    });
  }

  async deleteShift(id: string) {
    return this.prisma.shiftRoster.delete({ where: { id } });
  }

  // ─── PAYROLL ────────────────────────────────────────────────────

  async getPayrollHistory(propertyId: string, query: any = {}) {
    const { page = 1, limit = 20, status, employeeId } = query;
    const where: any = { employee: { propertyId } };
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;
    const [data, total] = await Promise.all([
      this.prisma.payrollRecord.findMany({
        where,
        include: {
          employee: { select: { firstName: true, lastName: true, employeeNumber: true, departmentId: true } },
        },
        orderBy: { periodStart: 'desc' },
        skip: (Number(page) - 1) * Number(limit), take: Number(limit),
      }),
      this.prisma.payrollRecord.count({ where }),
    ]);
    return { data, total };
  }

  async runPayroll(propertyId: string, periodStart: Date, periodEnd: Date) {
    const employees = await this.prisma.employee.findMany({
      where: { propertyId, status: 'ACTIVE' },
    });
    const records = await Promise.all(
      employees.map((emp) =>
        this.prisma.payrollRecord.create({
          data: {
            employeeId: emp.id,
            periodStart,
            periodEnd,
            baseSalary: emp.baseSalary,
            allowances: 0,
            overtime: 0,
            deductions: 0,
            tax: 0,
            netPay: emp.baseSalary,
            status: 'DRAFT',
          },
        }),
      ),
    );
    return { generated: records.length, status: 'DRAFT' };
  }

  async updatePayrollRecord(id: string, dto: any) {
    const allowed = ['allowances','overtime','deductions','tax','notes','status','paymentMethod','paidAt'];
    const data: any = {};
    for (const key of allowed) { if (key in dto) data[key] = dto[key]; }
    // Recalculate netPay
    const record = await this.prisma.payrollRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Payroll record not found');
    const baseSalary = Number(record.baseSalary);
    const allowances = Number(data.allowances ?? record.allowances);
    const overtime = Number(data.overtime ?? record.overtime);
    const deductions = Number(data.deductions ?? record.deductions);
    const tax = Number(data.tax ?? record.tax);
    data.netPay = baseSalary + allowances + overtime - deductions - tax;
    return this.prisma.payrollRecord.update({ where: { id }, data });
  }

  async approvePayrollRecord(id: string) {
    return this.prisma.payrollRecord.update({ where: { id }, data: { status: 'APPROVED' } });
  }

  async markPayrollPaid(id: string) {
    return this.prisma.payrollRecord.update({ where: { id }, data: { status: 'PAID', paidAt: new Date() } });
  }

  // ─── PAYROLL DEDUCTIONS ──────────────────────────────────────────

  async getPayrollDeductions(propertyId: string, query: any = {}) {
    const { employeeId, status } = query;
    const where: any = { employee: { propertyId } };
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    return this.prisma.payrollDeduction.findMany({
      where,
      include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPayrollDeduction(dto: any) {
    if (dto.amount < 0) throw new BadRequestException('Deduction amount cannot be negative');
    return this.prisma.payrollDeduction.create({ data: dto });
  }

  async approvePayrollDeduction(id: string, approvedById: string) {
    return this.prisma.payrollDeduction.update({
      where: { id },
      data: { status: 'APPROVED', approvedById, approvedAt: new Date() },
    });
  }

  async reversePayrollDeduction(id: string) {
    return this.prisma.payrollDeduction.update({ where: { id }, data: { status: 'REVERSED' } });
  }

  // ─── DISCIPLINARY ──────────────────────────────────────────────

  async getDisciplinaryCases(propertyId: string, query: any = {}) {
    const { employeeId, status, page = 1, limit = 20 } = query;
    const where: any = { propertyId };
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.disciplinaryCase.findMany({
        where,
        include: {
          employee: { select: { firstName: true, lastName: true, employeeNumber: true } },
          actions: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit), take: Number(limit),
      }),
      this.prisma.disciplinaryCase.count({ where }),
    ]);
    return { data, total };
  }

  async getDisciplinaryCase(id: string) {
    const c = await this.prisma.disciplinaryCase.findUnique({
      where: { id },
      include: {
        employee: { select: { firstName: true, lastName: true, employeeNumber: true, departmentId: true } },
        actions: true,
        payrollDeductions: true,
        suspensions: true,
      },
    });
    if (!c) throw new NotFoundException('Case not found');
    return c;
  }

  async createDisciplinaryCase(dto: any) {
    const year = new Date().getFullYear();
    const count = await this.prisma.disciplinaryCase.count({ where: { propertyId: dto.propertyId } });
    const caseNumber = `DISC-${year}-${String(count + 1).padStart(4, '0')}`;
    return this.prisma.disciplinaryCase.create({ data: { ...dto, caseNumber, incidentDate: new Date(dto.incidentDate) } });
  }

  async updateDisciplinaryCase(id: string, dto: any) {
    return this.prisma.disciplinaryCase.update({ where: { id }, data: dto });
  }

  async addDisciplinaryAction(caseId: string, dto: any) {
    return this.prisma.disciplinaryAction.create({
      data: { ...dto, caseId, effectiveDate: new Date(dto.effectiveDate) },
    });
  }

  // ─── SUSPENSIONS ───────────────────────────────────────────────

  async getSuspensions(propertyId: string, query: any = {}) {
    const { employeeId, status } = query;
    const where: any = { employee: { propertyId } };
    if (employeeId) where.employeeId = employeeId;
    return this.prisma.suspensionRecord.findMany({
      where,
      include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
      orderBy: { startDate: 'desc' },
    });
  }

  async createSuspension(dto: any) {
    const suspension = await this.prisma.suspensionRecord.create({
      data: { ...dto, startDate: new Date(dto.startDate), endDate: dto.endDate ? new Date(dto.endDate) : undefined },
    });
    await this.prisma.employee.update({
      where: { id: dto.employeeId },
      data: { status: 'SUSPENDED' },
    });
    return suspension;
  }

  async returnFromSuspension(id: string, returnDate: string) {
    const suspension = await this.prisma.suspensionRecord.update({
      where: { id },
      data: { returnDate: new Date(returnDate) },
      include: { employee: true },
    });
    await this.prisma.employee.update({
      where: { id: suspension.employeeId },
      data: { status: 'ACTIVE' },
    });
    return suspension;
  }

  // ─── GRIEVANCES ──────────────────────────────────────────────

  async getGrievances(propertyId: string, query: any = {}) {
    const { employeeId, status } = query;
    const where: any = { propertyId };
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    return this.prisma.grievanceCase.findMany({
      where,
      include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createGrievance(dto: any) {
    const year = new Date().getFullYear();
    const count = await this.prisma.grievanceCase.count({ where: { propertyId: dto.propertyId } });
    const caseNumber = `GRIEV-${year}-${String(count + 1).padStart(4, '0')}`;
    return this.prisma.grievanceCase.create({ data: { ...dto, caseNumber } });
  }

  async updateGrievance(id: string, dto: any) {
    return this.prisma.grievanceCase.update({ where: { id }, data: dto });
  }

  // ─── STAFF LOANS ─────────────────────────────────────────────

  async getStaffLoans(propertyId: string, query: any = {}) {
    const { employeeId, status } = query;
    const where: any = { employee: { propertyId } };
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    return this.prisma.staffLoan.findMany({
      where,
      include: {
        employee: { select: { firstName: true, lastName: true, employeeNumber: true } },
        repayments: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStaffLoan(dto: any) {
    const year = new Date().getFullYear();
    const count = await this.prisma.staffLoan.count();
    const loanNumber = `LOAN-${year}-${String(count + 1).padStart(5, '0')}`;
    return this.prisma.staffLoan.create({ data: { ...dto, loanNumber, balance: dto.amount } });
  }

  async approveStaffLoan(id: string, approvedById: string) {
    return this.prisma.staffLoan.update({
      where: { id },
      data: { status: 'APPROVED', approvedById, approvedAt: new Date() },
    });
  }

  async recordLoanRepayment(loanId: string, dto: { amount: number; payrollPeriod?: string; notes?: string }) {
    const loan = await this.prisma.staffLoan.findUnique({ where: { id: loanId } });
    if (!loan) throw new NotFoundException('Loan not found');
    const newBalance = Math.max(0, Number(loan.balance) - dto.amount);
    await this.prisma.staffLoan.update({
      where: { id: loanId },
      data: { balance: newBalance, status: newBalance === 0 ? 'SETTLED' : 'ACTIVE', settledAt: newBalance === 0 ? new Date() : undefined },
    });
    return this.prisma.staffLoanRepayment.create({ data: { loanId, ...dto } });
  }

  // ─── ASSET ISSUANCE ──────────────────────────────────────────

  async getAssetIssues(propertyId: string, query: any = {}) {
    const { employeeId, status } = query;
    const where: any = { employee: { propertyId } };
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    return this.prisma.employeeAssetIssue.findMany({
      where,
      include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
      orderBy: { issuedDate: 'desc' },
    });
  }

  async issueAsset(dto: any) {
    return this.prisma.employeeAssetIssue.create({ data: { ...dto, issuedDate: new Date(dto.issuedDate) } });
  }

  async returnAsset(id: string, dto: { conditionOnReturn: string; notes?: string }) {
    return this.prisma.employeeAssetIssue.update({
      where: { id },
      data: { status: 'RETURNED', returnedDate: new Date(), ...dto },
    });
  }

  // ─── PERFORMANCE REVIEWS ─────────────────────────────────────

  async getPerformanceReviews(propertyId: string, query: any = {}) {
    const { employeeId, status } = query;
    const where: any = { employee: { propertyId } };
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    return this.prisma.performanceReview.findMany({
      where,
      include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPerformanceReview(dto: any) {
    return this.prisma.performanceReview.create({ data: dto });
  }

  async updatePerformanceReview(id: string, dto: any) {
    return this.prisma.performanceReview.update({ where: { id }, data: dto });
  }

  // ─── PROBATION REVIEWS ───────────────────────────────────────

  async getProbationReviews(propertyId: string, query: any = {}) {
    const { employeeId } = query;
    const where: any = { employee: { propertyId } };
    if (employeeId) where.employeeId = employeeId;
    return this.prisma.probationReview.findMany({
      where,
      include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true, probationStartDate: true, probationEndDate: true } } },
      orderBy: { scheduledDate: 'desc' },
    });
  }

  async createProbationReview(dto: any) {
    return this.prisma.probationReview.create({ data: { ...dto, scheduledDate: new Date(dto.scheduledDate) } });
  }

  async updateProbationReview(id: string, dto: any) {
    const review = await this.prisma.probationReview.update({ where: { id }, data: dto });
    // If confirmed or terminated, update employee status / probationConfirmedAt
    if (dto.outcome === 'CONFIRMED') {
      await this.prisma.employee.update({
        where: { id: review.employeeId },
        data: { status: 'ACTIVE', probationConfirmedAt: new Date() },
      });
    } else if (dto.outcome === 'TERMINATED') {
      await this.prisma.employee.update({ where: { id: review.employeeId }, data: { status: 'TERMINATED' } });
    }
    return review;
  }

  // ─── TRAINING ────────────────────────────────────────────────

  async getTrainingPrograms(propertyId: string) {
    return this.prisma.trainingProgram.findMany({
      where: { propertyId, isActive: true },
      include: { _count: { select: { attendances: true } } },
      orderBy: { title: 'asc' },
    });
  }

  async createTrainingProgram(dto: any) {
    return this.prisma.trainingProgram.create({ data: dto });
  }

  async getTrainingAttendances(propertyId: string, query: any = {}) {
    const { employeeId, programId } = query;
    const where: any = { program: { propertyId } };
    if (employeeId) where.employeeId = employeeId;
    if (programId) where.programId = programId;
    return this.prisma.trainingAttendance.findMany({
      where,
      include: {
        program: true,
        employee: { select: { firstName: true, lastName: true, employeeNumber: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async recordTrainingAttendance(dto: any) {
    return this.prisma.trainingAttendance.create({ data: { ...dto, scheduledAt: new Date(dto.scheduledAt) } });
  }

  async completeTraining(id: string, dto: { score?: number; passed?: boolean; certUrl?: string; notes?: string }) {
    return this.prisma.trainingAttendance.update({
      where: { id },
      data: { ...dto, completedAt: new Date() },
    });
  }

  // ─── RECRUITMENT ─────────────────────────────────────────────

  async getJobOpenings(propertyId: string, query: any = {}) {
    const { status } = query;
    const where: any = { propertyId };
    if (status) where.status = status;
    return this.prisma.recruitmentJobOpening.findMany({
      where,
      include: { _count: { select: { candidates: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createJobOpening(dto: any) {
    return this.prisma.recruitmentJobOpening.create({ data: { ...dto, openDate: new Date(dto.openDate) } });
  }

  async updateJobOpening(id: string, dto: any) {
    return this.prisma.recruitmentJobOpening.update({ where: { id }, data: dto });
  }

  async getCandidates(jobOpeningId: string) {
    return this.prisma.candidate.findMany({
      where: { jobOpeningId },
      include: { interviews: { orderBy: { scheduledAt: 'desc' } } },
      orderBy: { appliedAt: 'desc' },
    });
  }

  async createCandidate(dto: any) {
    return this.prisma.candidate.create({ data: dto });
  }

  async updateCandidateStatus(id: string, status: string) {
    return this.prisma.candidate.update({ where: { id }, data: { status: status as any } });
  }

  async scheduleInterview(dto: any) {
    return this.prisma.candidateInterview.create({ data: { ...dto, scheduledAt: new Date(dto.scheduledAt) } });
  }

  async convertCandidateToEmployee(candidateId: string, employeeDto: any) {
    const candidate = await this.prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate) throw new NotFoundException('Candidate not found');
    const employee = await this.createEmployee(employeeDto);
    await this.prisma.candidate.update({
      where: { id: candidateId },
      data: { status: 'HIRED', hiredAsEmployeeId: employee.id },
    });
    const jobOpening = await this.prisma.recruitmentJobOpening.findUnique({ where: { id: candidate.jobOpeningId } });
    if (jobOpening) {
      await this.prisma.recruitmentJobOpening.update({ where: { id: jobOpening.id }, data: { status: 'FILLED' } });
    }
    return employee;
  }

  // ─── ONBOARDING ──────────────────────────────────────────────

  async getOnboardingChecklist(employeeId: string) {
    return this.prisma.onboardingChecklist.findUnique({ where: { employeeId } });
  }

  async updateOnboardingChecklist(employeeId: string, dto: any) {
    const checklist = await this.prisma.onboardingChecklist.upsert({
      where: { employeeId },
      create: { employeeId, ...dto },
      update: dto,
    });
    // Auto-mark complete if all fields are true
    const fields = ['contractUploaded','idCaptured','roleAssigned','payrollCreated','deptAssigned','uniformIssued','systemAccess','orientationDone','policyAcknowledged'];
    const allDone = fields.every((f) => checklist[f as keyof typeof checklist]);
    if (allDone && checklist.status !== 'COMPLETED') {
      await this.prisma.onboardingChecklist.update({ where: { employeeId }, data: { status: 'COMPLETED', completedAt: new Date() } });
    }
    return checklist;
  }

  // ─── OFFBOARDING ─────────────────────────────────────────────

  async getOffboardingCases(propertyId: string) {
    return this.prisma.offboardingCase.findMany({
      where: { employee: { propertyId } },
      include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createOffboardingCase(dto: any) {
    const offboarding = await this.prisma.offboardingCase.create({ data: dto });
    await this.prisma.employee.update({
      where: { id: dto.employeeId },
      data: { status: dto.separationType === 'RESIGNATION' ? 'RESIGNED' : 'TERMINATED' },
    }).catch(() => null);
    return offboarding;
  }

  async updateOffboardingCase(id: string, dto: any) {
    return this.prisma.offboardingCase.update({ where: { id }, data: dto });
  }

  // ─── CASH HANDLING INCIDENTS ─────────────────────────────────

  async getCashIncidents(propertyId: string, query: any = {}) {
    const { employeeId, status } = query;
    const where: any = { propertyId };
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    return this.prisma.cashHandlingIncident.findMany({
      where,
      include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
      orderBy: { incidentDate: 'desc' },
    });
  }

  async createCashIncident(dto: any) {
    return this.prisma.cashHandlingIncident.create({ data: { ...dto, incidentDate: new Date(dto.incidentDate) } });
  }

  async updateCashIncident(id: string, dto: any) {
    return this.prisma.cashHandlingIncident.update({ where: { id }, data: dto });
  }

  // ─── EMPLOYEE DOCUMENTS ───────────────────────────────────────

  async getEmployeeDocuments(employeeId: string) {
    return this.prisma.employeeDocument.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadEmployeeDocument(dto: any) {
    return this.prisma.employeeDocument.create({ data: dto });
  }

  async deleteEmployeeDocument(id: string) {
    return this.prisma.employeeDocument.delete({ where: { id } });
  }

  // ─── POLICY DOCUMENTS ─────────────────────────────────────────

  async getPolicies(propertyId: string) {
    return this.prisma.policyDocument.findMany({
      where: { propertyId, isActive: true },
      include: { _count: { select: { acknowledgements: true } } },
      orderBy: { title: 'asc' },
    });
  }

  async createPolicy(dto: any) {
    return this.prisma.policyDocument.create({ data: { ...dto, effectiveDate: new Date(dto.effectiveDate) } });
  }

  async acknowledgePolicy(policyId: string, employeeId: string) {
    return this.prisma.policyAcknowledgement.upsert({
      where: { policyId_employeeId: { policyId, employeeId } },
      create: { policyId, employeeId },
      update: { acknowledgedAt: new Date() },
    });
  }

  // ─── EMPLOYEE INCIDENTS (HEALTH & SAFETY) ────────────────────

  async getEmployeeIncidents(propertyId: string, query: any = {}) {
    const { employeeId } = query;
    const where: any = { propertyId };
    if (employeeId) where.employeeId = employeeId;
    return this.prisma.employeeIncident.findMany({
      where,
      include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
      orderBy: { incidentDate: 'desc' },
    });
  }

  async createEmployeeIncident(dto: any) {
    return this.prisma.employeeIncident.create({ data: { ...dto, incidentDate: new Date(dto.incidentDate) } });
  }

  async updateEmployeeIncident(id: string, dto: any) {
    return this.prisma.employeeIncident.update({ where: { id }, data: dto });
  }

  // ─── BENEFITS ────────────────────────────────────────────────

  async getEmployeeBenefits(employeeId: string) {
    return this.prisma.employeeBenefit.findMany({ where: { employeeId }, orderBy: { benefitType: 'asc' } });
  }

  async createEmployeeBenefit(dto: any) {
    return this.prisma.employeeBenefit.create({ data: { ...dto, startDate: new Date(dto.startDate) } });
  }

  async updateEmployeeBenefit(id: string, dto: any) {
    return this.prisma.employeeBenefit.update({ where: { id }, data: dto });
  }

  // ─── HR APPROVAL REQUESTS ─────────────────────────────────────

  async getHRApprovals(propertyId: string, query: any = {}) {
    const { status } = query;
    const where: any = { propertyId };
    if (status) where.status = status;
    return this.prisma.hRApprovalRequest.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async createHRApproval(dto: any) {
    return this.prisma.hRApprovalRequest.create({ data: dto });
  }

  async decideHRApproval(id: string, dto: { status: 'APPROVED' | 'REJECTED'; notes?: string }) {
    return this.prisma.hRApprovalRequest.update({
      where: { id },
      data: { ...dto, decidedAt: new Date() },
    });
  }

  // ─── DEPARTMENTS ─────────────────────────────────────────────

  async getDepartments(tenantId: string) {
    return this.prisma.department.findMany({
      where: { tenantId },
      include: { _count: { select: { employees: true } } },
    });
  }

  // ─── HR REPORTS ───────────────────────────────────────────────

  async getHRDashboardStats(propertyId: string) {
    const [
      totalEmployees, activeEmployees, onLeave, suspended,
      pendingLeaves, pendingApprovals, openDisciplinaryCases,
      probationDue, contractsExpiring, openAnomalies,
    ] = await Promise.all([
      this.prisma.employee.count({ where: { propertyId } }),
      this.prisma.employee.count({ where: { propertyId, status: 'ACTIVE' } }),
      this.prisma.employee.count({ where: { propertyId, status: 'ON_LEAVE' } }),
      this.prisma.employee.count({ where: { propertyId, status: 'SUSPENDED' } }),
      this.prisma.leaveRequest.count({ where: { employee: { propertyId }, status: 'PENDING' } }),
      this.prisma.hRApprovalRequest.count({ where: { propertyId, status: 'PENDING' } }),
      this.prisma.disciplinaryCase.count({ where: { propertyId, status: { notIn: ['CLOSED', 'REJECTED'] } } }),
      this.prisma.employee.count({
        where: {
          propertyId, status: 'PROBATION',
          probationEndDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.employee.count({
        where: {
          propertyId,
          contractEndDate: { lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), gte: new Date() },
        },
      }),
      this.prisma.attendanceAnomaly.count({ where: { employee: { propertyId }, status: 'OPEN' } }),
    ]);
    return {
      totalEmployees, activeEmployees, onLeave, suspended,
      pendingLeaves, pendingApprovals, openDisciplinaryCases,
      probationDue, contractsExpiring, openAnomalies,
    };
  }

  async getHeadcountByDepartment(propertyId: string) {
    return this.prisma.employee.groupBy({
      by: ['departmentId'],
      where: { propertyId, status: 'ACTIVE' },
      _count: { id: true },
    });
  }

  async getPayrollSummary(propertyId: string, period: string) {
    const records = await this.prisma.payrollRecord.findMany({
      where: { employee: { propertyId }, periodStart: { gte: new Date(`${period}-01`) } },
      include: { employee: { select: { firstName: true, lastName: true, departmentId: true } } },
    });
    const total = records.reduce((s, r) => ({
      baseSalary: s.baseSalary + Number(r.baseSalary),
      allowances: s.allowances + Number(r.allowances),
      overtime: s.overtime + Number(r.overtime),
      deductions: s.deductions + Number(r.deductions),
      tax: s.tax + Number(r.tax),
      netPay: s.netPay + Number(r.netPay),
    }), { baseSalary: 0, allowances: 0, overtime: 0, deductions: 0, tax: 0, netPay: 0 });
    return { records, summary: total };
  }
}
