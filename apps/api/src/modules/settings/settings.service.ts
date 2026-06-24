import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getProperty(propertyId: string) {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async updateProperty(propertyId: string, dto: any) {
    const allowed = [
      'name', 'code', 'type', 'description', 'address', 'city', 'country',
      'phone', 'email', 'starRating', 'checkInTime', 'checkOutTime',
      'logoUrl', 'coverImageUrl', 'currency', 'timezone', 'invoiceTemplate', 'isActive',
    ];
    const data: any = {};
    for (const key of allowed) {
      if (key in dto) data[key] = dto[key];
    }
    return this.prisma.property.update({ where: { id: propertyId }, data });
  }

  private async guardSuperAdmin(targetUserId: string, requestorRole: string) {
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId }, select: { role: true } });
    if (!target) throw new NotFoundException('User not found');
    if (target.role === 'SUPER_ADMIN' && requestorRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only SUPER_ADMIN can manage other SUPER_ADMIN users');
    }
    return target;
  }

  async getUsers(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        role: true, isActive: true, twoFactorEnabled: true,
        createdAt: true, lastLoginAt: true,
      },
      orderBy: { firstName: 'asc' },
    });
  }

  async updateUser(userId: string, dto: { firstName?: string; lastName?: string }, requestorRole: string) {
    await this.guardSuperAdmin(userId, requestorRole);
    return this.prisma.user.update({
      where: { id: userId },
      data: { firstName: dto.firstName, lastName: dto.lastName },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true },
    });
  }

  async updateUserEmail(userId: string, newEmail: string, requestorRole: string) {
    await this.guardSuperAdmin(userId, requestorRole);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { tenantId: true } });
    if (!user) throw new NotFoundException('User not found');
    const conflict = await this.prisma.user.findFirst({ where: { tenantId: user.tenantId, email: newEmail } });
    if (conflict && conflict.id !== userId) throw new ConflictException('Email is already in use by another user');
    return this.prisma.user.update({
      where: { id: userId },
      data: { email: newEmail },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
    });
  }

  async resetUserPassword(userId: string, requestorRole: string) {
    await this.guardSuperAdmin(userId, requestorRole);
    const temporaryPassword = randomBytes(9).toString('base64').slice(0, 12);
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash, passwordChangedAt: new Date() } });
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    return { temporaryPassword };
  }

  async toggleUserActive(userId: string, requestorRole: string, requestorId: string) {
    if (userId === requestorId) throw new ForbiddenException('Cannot deactivate your own account');
    const target = await this.guardSuperAdmin(userId, requestorRole);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { isActive: true } });
    if (!user) throw new NotFoundException('User not found');
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true },
    });
    if (!updated.isActive) {
      await this.prisma.refreshToken.deleteMany({ where: { userId } });
    }
    return updated;
  }

  async inviteUser(dto: any) {
    const tenantId = dto.tenantId || dto.propertyId;
    const existing = await this.prisma.user.findFirst({
      where: { tenantId, email: dto.email },
    });
    if (existing) return existing;

    const rawPassword = dto.password || randomBytes(12).toString('hex');
    const passwordHash = await bcrypt.hash(rawPassword, 12);
    return this.prisma.user.create({
      data: {
        ...dto,
        tenantId,
        passwordHash,
        isActive: true,
      },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
    });
  }

  async updateUserRole(userId: string, role: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
    });
  }

  async getTaxRates(propertyId: string) {
    return this.prisma.taxRate.findMany({
      where: { propertyId } as any,
      orderBy: { name: 'asc' } as any,
    });
  }

  async createTaxRate(dto: any) {
    return this.prisma.taxRate.create({ data: dto } as any);
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, createdAt: true },
    });
  }

  async updateProfile(userId: string, dto: any) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });
  }

  async getDepartments(tenantId: string) {
    return this.prisma.department.findMany({
      where: { tenantId, isActive: true },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createDepartment(dto: { tenantId: string; name: string; code: string; description?: string }) {
    return this.prisma.department.create({
      data: { ...dto, code: dto.code.toUpperCase() },
    });
  }

  async updateDepartment(id: string, dto: { name?: string; description?: string; isActive?: boolean }) {
    return this.prisma.department.update({ where: { id }, data: dto });
  }

  getPolicyDefaults() {
    return {
      booking: {
        holdDurationMinutes: 60,
        defaultDepositPercent: 0,
        depositRequiredDaysOut: 0,
        freeCancellationHours: 24,
        cancellationRefundPercent: 100,
        allowOverbooking: false,
        overbookingPercent: 5,
      },
      nightAudit: {
        autoChargeEnabled: true,
        noShowGraceMinutes: 120,
        scheduledTime: '03:00',
      },
      attendance: {
        graceMinutes: 15,
        halfDayThresholdHours: 4,
        earlyDepartureTolerance: 15,
        highSeverityThresholdMinutes: 60,
        probationAlertDays: 30,
        contractAlertDays: 60,
      },
      accounting: {
        fiscalYearStartMonth: 1,
        defaultInvoiceDueDays: 30,
        invoicePrefix: 'INV',
        journalPrefix: 'JE',
      },
      procurement: {
        approvalThreshold: 0,
        defaultPaymentTermsDays: 30,
      },
      loyalty: {
        tierThresholds: { BRONZE: 0, SILVER: 500, GOLD: 2000, PLATINUM: 5000, VIP: 10000 },
        defaultEarningRate: 1,
      },
      notifications: {
        emailOnNewReservation: true,
        emailOnCheckOut: true,
        emailOnInvoiceCreated: true,
        emailOnPaymentReceived: true,
        inAppOnNewReservation: true,
        inAppOnPaymentReceived: true,
        inAppOnMaintenanceAlert: true,
        inAppOnLowInventory: true,
      },
    };
  }

  async getPolicyConfig(propertyId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { policyConfig: true },
    });
    if (!property) throw new NotFoundException('Property not found');
    const defaults = this.getPolicyDefaults();
    const stored = (property.policyConfig as any) ?? {};
    // Deep merge: stored values override defaults section by section
    return {
      booking: { ...defaults.booking, ...(stored.booking ?? {}) },
      nightAudit: { ...defaults.nightAudit, ...(stored.nightAudit ?? {}) },
      attendance: { ...defaults.attendance, ...(stored.attendance ?? {}) },
      accounting: { ...defaults.accounting, ...(stored.accounting ?? {}) },
      procurement: { ...defaults.procurement, ...(stored.procurement ?? {}) },
      loyalty: {
        ...defaults.loyalty,
        ...(stored.loyalty ?? {}),
        tierThresholds: { ...defaults.loyalty.tierThresholds, ...(stored.loyalty?.tierThresholds ?? {}) },
      },
      notifications: { ...defaults.notifications, ...(stored.notifications ?? {}) },
    };
  }

  async updatePolicyConfig(propertyId: string, patch: any) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { policyConfig: true },
    });
    if (!property) throw new NotFoundException('Property not found');
    const current = (property.policyConfig as any) ?? {};
    // Deep merge patch sections into current
    const merged: any = { ...current };
    for (const section of Object.keys(patch)) {
      if (section === 'loyalty' && patch.loyalty?.tierThresholds) {
        merged.loyalty = {
          ...(current.loyalty ?? {}),
          ...patch.loyalty,
          tierThresholds: { ...(current.loyalty?.tierThresholds ?? {}), ...patch.loyalty.tierThresholds },
        };
      } else {
        merged[section] = { ...(current[section] ?? {}), ...patch[section] };
      }
    }
    await this.prisma.property.update({ where: { id: propertyId }, data: { policyConfig: merged } });
    return this.getPolicyConfig(propertyId);
  }

  async getAuditLog(tenantId: string, query: any = {}) {
    const { entityType, userId, page = 1, limit = 50 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (entityType) where.entity = entityType;
    if (userId) where.userId = userId;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total };
  }
}
