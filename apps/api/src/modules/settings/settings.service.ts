import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private config: ConfigService,
  ) {}

  async getProperty(propertyId?: string, tenantId?: string) {
    if (propertyId) {
      const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
      if (!property) throw new NotFoundException('Property not found');
      return property;
    }
    if (tenantId) {
      const property = await this.prisma.property.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'asc' },
      });
      if (!property) throw new NotFoundException('No property found for this tenant');
      return property;
    }
    throw new NotFoundException('Property not found');
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

  private readonly ALLOWED_POLICY_SECTIONS = new Set([
    'booking', 'nightAudit', 'attendance', 'accounting', 'procurement', 'loyalty', 'notifications',
  ]);

  async getPolicyConfig(propertyId: string, tenantId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { policyConfig: true, tenantId: true },
    });
    if (!property) throw new NotFoundException('Property not found');
    if (property.tenantId !== tenantId) throw new ForbiddenException('Access denied');
    const defaults = this.getPolicyDefaults();
    const stored = (property.policyConfig as any) ?? {};
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

  async updatePolicyConfig(propertyId: string, patch: any, tenantId: string) {
    await this.prisma.$transaction(async (tx) => {
      const property = await tx.property.findUnique({
        where: { id: propertyId },
        select: { policyConfig: true, tenantId: true },
      });
      if (!property) throw new NotFoundException('Property not found');
      if (property.tenantId !== tenantId) throw new ForbiddenException('Access denied');
      const current = (property.policyConfig as any) ?? {};
      const merged: any = { ...current };
      for (const section of Object.keys(patch)) {
        if (!this.ALLOWED_POLICY_SECTIONS.has(section)) continue;
        const sectionPatch = patch[section];
        if (typeof sectionPatch !== 'object' || Array.isArray(sectionPatch) || sectionPatch === null) continue;
        if (section === 'loyalty' && sectionPatch.tierThresholds) {
          merged.loyalty = {
            ...(current.loyalty ?? {}),
            ...sectionPatch,
            tierThresholds: { ...(current.loyalty?.tierThresholds ?? {}), ...sectionPatch.tierThresholds },
          };
        } else {
          merged[section] = { ...(current[section] ?? {}), ...sectionPatch };
        }
      }
      await tx.property.update({ where: { id: propertyId }, data: { policyConfig: merged } });
    });
    return this.getPolicyConfig(propertyId, tenantId);
  }

  private getEmailDefaults(propertyName: string) {
    return {
      fromName: propertyName,
      fromEmail: this.config.get('EMAIL_FROM') ?? 'noreply@marylandguesthouse.com',
      replyTo: '',
    };
  }

  async getEmailConfig(propertyId: string, tenantId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { emailConfig: true, tenantId: true, name: true },
    });
    if (!property) throw new NotFoundException('Property not found');
    if (property.tenantId !== tenantId) throw new ForbiddenException('Access denied');
    const defaults = this.getEmailDefaults(property.name);
    const stored = (property.emailConfig as any) ?? {};
    return {
      fromName: stored.fromName ?? defaults.fromName,
      fromEmail: stored.fromEmail ?? defaults.fromEmail,
      replyTo: stored.replyTo ?? defaults.replyTo,
      active: !!this.config.get('RESEND_API_KEY'),
    };
  }

  async updateEmailConfig(propertyId: string, dto: any, tenantId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { emailConfig: true, tenantId: true },
    });
    if (!property) throw new NotFoundException('Property not found');
    if (property.tenantId !== tenantId) throw new ForbiddenException('Access denied');
    const current = (property.emailConfig as any) ?? {};
    const updated: any = { ...current };
    if ('fromName' in dto) updated.fromName = String(dto.fromName).slice(0, 100);
    if ('fromEmail' in dto) updated.fromEmail = String(dto.fromEmail).slice(0, 200);
    if ('replyTo' in dto) updated.replyTo = String(dto.replyTo ?? '').slice(0, 200);
    await this.prisma.property.update({ where: { id: propertyId }, data: { emailConfig: updated } });
    return this.getEmailConfig(propertyId, tenantId);
  }

  async sendTestEmail(propertyId: string, toEmail: string, tenantId: string) {
    const cfg = await this.getEmailConfig(propertyId, tenantId);
    await this.emailService.sendTestEmail({ to: toEmail, fromName: cfg.fromName, fromEmail: cfg.fromEmail });
    return { sent: true, to: toEmail };
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
