import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

const TIER_THRESHOLDS = { BRONZE: 0, SILVER: 500, GOLD: 2000, PLATINUM: 5000, VIP: 10000 };

function getTierForPoints(points: number): string {
  if (points >= TIER_THRESHOLDS.VIP) return 'VIP';
  if (points >= TIER_THRESHOLDS.PLATINUM) return 'PLATINUM';
  if (points >= TIER_THRESHOLDS.GOLD) return 'GOLD';
  if (points >= TIER_THRESHOLDS.SILVER) return 'SILVER';
  return 'BRONZE';
}

@Injectable()
export class LoyaltyService {
  constructor(private prisma: PrismaService) {}

  async getMembers(query: any = {}) {
    const { tier, search, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (tier) where.tier = tier;
    if (search) {
      where.guest = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.loyaltyAccount.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { points: 'desc' },
        include: {
          guest: { select: { firstName: true, lastName: true, email: true, phone: true, totalStays: true } },
        },
      }),
      this.prisma.loyaltyAccount.count({ where }),
    ]);

    return { data, total };
  }

  async getMember(guestId: string) {
    const account = await this.prisma.loyaltyAccount.findFirst({
      where: { guestId },
      include: {
        guest: { select: { firstName: true, lastName: true, email: true, phone: true } },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        redemptions: {
          orderBy: { createdAt: 'desc' } as any,
          take: 10,
        },
      },
    });
    if (!account) throw new NotFoundException('Loyalty account not found');
    return account;
  }

  async earnPoints(dto: any) {
    const { guestId, points, description, referenceId, referenceType } = dto;

    const account = await this.prisma.loyaltyAccount.findFirst({ where: { guestId } });
    if (!account) throw new NotFoundException('Loyalty account not found');

    const newPoints = account.points + points;
    const newLifetime = account.lifetimePoints + points;
    const newTier = getTierForPoints(newLifetime) as any;

    const [updated] = await this.prisma.$transaction([
      this.prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: { points: newPoints, lifetimePoints: newLifetime, tier: newTier },
      }),
      this.prisma.loyaltyTransaction.create({
        data: {
          loyaltyAccountId: account.id,
          points,
          type: 'EARN',
          description: description || `Earned ${points} points`,
          referenceId,
          referenceType,
        },
      }),
    ]);

    return updated;
  }

  async redeemPoints(dto: any) {
    const { guestId, points, reward, referenceId } = dto;

    const account = await this.prisma.loyaltyAccount.findFirst({ where: { guestId } });
    if (!account) throw new NotFoundException('Loyalty account not found');
    if (account.points < points) throw new BadRequestException('Insufficient points');

    const [updated] = await this.prisma.$transaction([
      this.prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: { points: account.points - points },
      }),
      this.prisma.loyaltyTransaction.create({
        data: {
          loyaltyAccountId: account.id,
          points: -points,
          type: 'REDEEM',
          description: reward || `Redeemed ${points} points`,
          referenceId,
        },
      }),
    ]);

    return updated;
  }

  async getRules() {
    return this.prisma.loyaltyRule.findMany({
      where: { isActive: true } as any,
      orderBy: { createdAt: 'asc' } as any,
    });
  }

  async createRule(dto: any) {
    return this.prisma.loyaltyRule.create({ data: dto } as any);
  }

  async updateRule(id: string, dto: any) {
    return this.prisma.loyaltyRule.update({ where: { id }, data: dto } as any);
  }

  async getStats(propertyId: string) {
    const [total, byTier, pointsThisMonth] = await Promise.all([
      this.prisma.loyaltyAccount.count(),
      this.prisma.loyaltyAccount.groupBy({ by: ['tier'], _count: { id: true } }),
      this.prisma.loyaltyTransaction.aggregate({
        where: {
          type: 'EARN',
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
        _sum: { points: true },
      }),
    ]);

    return {
      totalMembers: total,
      byTier: Object.fromEntries(byTier.map((b) => [b.tier, b._count.id])),
      pointsIssuedThisMonth: pointsThisMonth._sum.points ?? 0,
    };
  }
}
