import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class GuestsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: any = {}) {
    const { search, page = 1, limit = 20, blacklisted } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { passportNumber: { contains: search, mode: 'insensitive' } },
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

    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) };
  }

  async findOne(id: string) {
    const guest = await this.prisma.guest.findUnique({
      where: { id },
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
    return guest;
  }

  async create(dto: any) {
    return this.prisma.guest.create({ data: dto });
  }

  async update(id: string, dto: any) {
    return this.prisma.guest.update({ where: { id }, data: dto });
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
}
