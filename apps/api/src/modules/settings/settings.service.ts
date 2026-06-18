import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';

function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(salt + plain).digest('hex');
  return `${salt}:${hash}`;
}

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getProperty(propertyId: string) {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async updateProperty(propertyId: string, dto: any) {
    return this.prisma.property.update({ where: { id: propertyId }, data: dto });
  }

  async getUsers(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        role: true, createdAt: true, lastLoginAt: true,
      },
      orderBy: { firstName: 'asc' },
    });
  }

  async inviteUser(dto: any) {
    const tenantId = dto.tenantId || dto.propertyId;
    const existing = await this.prisma.user.findFirst({
      where: { tenantId, email: dto.email },
    });
    if (existing) return existing;

    const passwordHash = hashPassword(dto.password || 'ChangeMe123!');
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

  async getAuditLog(tenantId: string, query: any = {}) {
    const { entityType, userId, page = 1, limit = 50 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (entityType) where.entityType = entityType;
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
