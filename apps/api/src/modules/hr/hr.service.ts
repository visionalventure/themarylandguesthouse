import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class HrService {
  constructor(private prisma: PrismaService) {}

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
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where, skip: (Number(page) - 1) * Number(limit), take: Number(limit),
        include: { department: true },
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
        attendances: { take: 30, orderBy: { date: 'desc' } },
        leaveRequests: { take: 10, orderBy: { createdAt: 'desc' } },
        payrolls: { take: 6, orderBy: { periodStart: 'desc' } },
        performanceReviews: { take: 3, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!emp) throw new NotFoundException('Employee not found');
    return emp;
  }

  async createEmployee(dto: any) {
    const count = await this.prisma.employee.count({ where: { propertyId: dto.propertyId } });
    const employeeNumber = `EMP-${(count + 1).toString().padStart(4, '0')}`;
    return this.prisma.employee.create({
      data: { ...dto, employeeNumber },
      include: { department: true },
    });
  }

  async recordAttendance(dto: any) {
    return this.prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: dto.employeeId, date: new Date(dto.date) } },
      create: { ...dto, date: new Date(dto.date) },
      update: { clockOut: dto.clockOut, hoursWorked: dto.hoursWorked, status: dto.status },
    });
  }

  async getAttendanceReport(propertyId: string, startDate: Date, endDate: Date) {
    return this.prisma.attendance.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        employee: { propertyId },
      },
      include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async getLeaveRequests(propertyId: string, query: any = {}) {
    const { status, page = 1, limit = 50 } = query;
    const where: any = { employee: { propertyId } };
    if (status) where.status = status;
    const skip = (Number(page) - 1) * Number(limit);

    const [data, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        include: {
          employee: { select: { firstName: true, lastName: true, employeeNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
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

  async getPayrollHistory(propertyId: string, query: any = {}) {
    const { page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const [data, total] = await Promise.all([
      this.prisma.payrollRecord.findMany({
        where: { employee: { propertyId } },
        include: {
          employee: { select: { firstName: true, lastName: true, employeeNumber: true } },
        },
        orderBy: { periodStart: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.payrollRecord.count({ where: { employee: { propertyId } } }),
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

  async getDepartments(tenantId: string) {
    return this.prisma.department.findMany({
      where: { tenantId },
      include: { _count: { select: { employees: true } } },
    });
  }
}
