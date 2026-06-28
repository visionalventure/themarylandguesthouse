import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

const FULL_ACCESS_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
const FRONT_DESK_ROLES  = ['FRONT_DESK'];
const HOUSEKEEPER_ROLES = ['HOUSEKEEPING'];
const ACCOUNTANT_ROLES  = ['ACCOUNTANT'];

@Injectable()
export class GuestsService {
  constructor(private prisma: PrismaService) {}

  // ── Privacy Helpers ─────────────────────────────────────────

  private maskGuestData(guest: any, role: string): any {
    if (!guest) return guest;
    const privacyType: string = guest.privacyType ?? 'STANDARD';
    const alias: string = guest.alias ?? `PRIVATE-${guest.id?.slice(-4).toUpperCase()}`;
    const isRestricted = privacyType === 'PRIVATE' || privacyType === 'CONFIDENTIAL';

    if (FULL_ACCESS_ROLES.includes(role)) return guest;

    if (ACCOUNTANT_ROLES.includes(role)) {
      return {
        id: guest.id,
        alias,
        privacyType,
        totalSpent: guest.totalSpent,
        reservations: guest.reservations,
        invoices: guest.invoices,
      };
    }

    if (HOUSEKEEPER_ROLES.includes(role)) {
      return {
        id: guest.id,
        displayName: isRestricted ? alias : `${guest.firstName} ${guest.lastName}`,
        privacyType,
        alias,
        roomPreferences: guest.roomPreferences,
        dietaryPrefs: guest.dietaryPrefs,
      };
    }

    // FRONT_DESK: full data for STANDARD/VIP, alias for PRIVATE/CONFIDENTIAL
    if (isRestricted) {
      return {
        id: guest.id,
        firstName: alias,
        lastName: '',
        alias,
        privacyType,
        loyaltyAccount: guest.loyaltyAccount,
        reservations: guest.reservations,
        invoices: guest.invoices,
        totalStays: guest.totalStays,
        totalSpent: guest.totalSpent,
        createdAt: guest.createdAt,
      };
    }

    // STANDARD/VIP: full data for any remaining role (e.g. RESTAURANT_STAFF)
    return guest;
  }

  private async generateAlias(privacyType: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix =
      privacyType === 'CONFIDENTIAL' ? 'CONFIDENTIAL'
      : privacyType === 'VIP'        ? 'VIP'
      : 'PRIVATE';
    const count = await this.prisma.guest.count({
      where: { privacyType: privacyType as any },
    });
    return `${prefix}-${year}-${String(count + 1).padStart(3, '0')}`;
  }

  // ── Stats ──────────────────────────────────────────────────

  async getStats(tenantId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [total, loyaltyMembers, vipGuests, newThisMonth] = await Promise.all([
      this.prisma.guest.count({ where: { tenantId, isDeleted: false } }),
      this.prisma.loyaltyAccount.count({ where: { guest: { tenantId, isDeleted: false } } }),
      this.prisma.guest.count({ where: { tenantId, isDeleted: false, privacyType: 'VIP' } }),
      this.prisma.guest.count({ where: { tenantId, isDeleted: false, createdAt: { gte: startOfMonth } } }),
    ]);

    return { total, loyaltyMembers, vipGuests, newThisMonth };
  }

  // ── Core CRUD ──────────────────────────────────────────────

  async findAll(tenantId: string, query: any = {}, role = 'FRONT_DESK') {
    const { search, page = 1, limit = 20, blacklisted } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId, isDeleted: false };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { passportNumber: { contains: search, mode: 'insensitive' } },
        { alias: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (blacklisted !== undefined) where.blacklisted = blacklisted === 'true';

    const [data, total] = await Promise.all([
      this.prisma.guest.findMany({
        where, skip, take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          loyaltyAccount: { select: { tier: true, points: true, memberNumber: true } },
          _count: { select: { reservations: true } },
        },
      }),
      this.prisma.guest.count({ where }),
    ]);

    const masked = data.map((g) => this.maskGuestData(g, role));
    return { data: masked, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) };
  }

  async findOne(id: string, role = 'FRONT_DESK') {
    const guest = await this.prisma.guest.findUnique({
      where: { id, isDeleted: false } as any,
      include: {
        loyaltyAccount: { include: { transactions: { take: 10, orderBy: { createdAt: 'desc' } } } },
        reservations: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { rooms: { include: { room: { select: { roomNumber: true } } } } },
        },
        invoices: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!guest) throw new NotFoundException('Guest not found');
    return this.maskGuestData(guest, role);
  }

  async revealIdentity(id: string, viewedBy: string, tenantId: string, reason: string | undefined, ipAddress: string | undefined) {
    const guest = await this.prisma.guest.findFirst({ where: { id, tenantId } });
    if (!guest) throw new NotFoundException('Guest not found');

    await this.prisma.guestPrivacyLog.create({
      data: { guestId: id, viewedBy, action: 'VIEW_IDENTITY', reason, ipAddress },
    });

    return guest;
  }

  async create(dto: any) {
    const { propertyId: _p, ...data } = dto;
    for (const key of ['email', 'phone', 'nationality', 'passportNumber', 'address', 'city', 'country', 'company', 'notes']) {
      if (data[key] === '') data[key] = undefined;
    }
    if (data.privacyType && data.privacyType !== 'STANDARD' && !data.alias) {
      data.alias = await this.generateAlias(data.privacyType);
    }
    return this.prisma.guest.create({ data });
  }

  async update(id: string, dto: any) {
    const existing = await this.prisma.guest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Guest not found');
    const data: any = { ...dto };
    if (
      data.privacyType &&
      data.privacyType !== 'STANDARD' &&
      !data.alias &&
      !existing.alias
    ) {
      data.alias = await this.generateAlias(data.privacyType);
    }
    return this.prisma.guest.update({ where: { id }, data });
  }

  async getStayHistory(guestId: string) {
    return this.prisma.reservation.findMany({
      where: { guestId },
      orderBy: { checkIn: 'desc' },
      include: {
        rooms: { include: { room: { include: { category: true } } } },
        payments: true,
      },
    });
  }

  async getSpendingAnalysis(guestId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { guestId, status: 'COMPLETED' },
    });
    const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const byMethod: Record<string, number> = {};
    payments.forEach((p) => {
      byMethod[p.method] = (byMethod[p.method] || 0) + Number(p.amount);
    });
    return { total, paymentMethods: byMethod, count: payments.length };
  }

  async deleteGuest(id: string, requestorRole: string, tenantId: string) {
    const guest = await this.prisma.guest.findUnique({ where: { id } });
    if (!guest || guest.isDeleted) throw new NotFoundException('Guest not found');
    if (guest.tenantId !== tenantId) throw new ForbiddenException('Access denied');

    const activeReservation = await this.prisma.reservation.findFirst({
      where: { guestId: id, status: { in: ['RESERVED', 'CONFIRMED', 'CHECKED_IN'] } },
    });
    if (activeReservation) throw new BadRequestException('Cannot delete a guest with active reservations');

    await this.prisma.guest.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    return { deleted: true };
  }
}
