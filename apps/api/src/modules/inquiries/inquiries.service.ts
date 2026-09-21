import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateInquiryDto, UpdateInquiryDto, InquiryQueryDto, DEFAULT_INQUIRY_TYPES } from './dto/inquiries.dto';

@Injectable()
export class InquiriesService {
  constructor(private prisma: PrismaService) {}

  // The built-in categories plus every distinct custom category anyone at
  // this tenant has typed in before - so a custom type entered once shows up
  // as a normal pickable option for every inquiry logged after it.
  async getTypes(tenantId: string) {
    const rows = await this.prisma.inquiry.findMany({
      where: { property: { tenantId } },
      distinct: ['type'],
      select: { type: true },
      orderBy: { type: 'asc' },
    });
    const custom = rows.map((r) => r.type).filter((t) => t && !DEFAULT_INQUIRY_TYPES.includes(t) && t !== 'OTHER');
    return { defaults: DEFAULT_INQUIRY_TYPES, custom };
  }

  async getStats(tenantId: string, propertyId?: string) {
    const where: any = { property: { tenantId }, ...(propertyId ? { propertyId } : {}) };
    const [total, byStatus, needsFollowUp] = await Promise.all([
      this.prisma.inquiry.count({ where }),
      this.prisma.inquiry.groupBy({ by: ['status'], where, _count: { id: true } }),
      this.prisma.inquiry.count({ where: { ...where, status: { in: ['NEW', 'CONTACTED'] } } }),
    ]);
    return {
      total,
      byStatus: Object.fromEntries(byStatus.map((b) => [b.status, b._count.id])),
      needsFollowUp,
    };
  }

  async findAll(tenantId: string, query: InquiryQueryDto) {
    const { propertyId, status, type, search, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { property: { tenantId } };
    if (propertyId) where.propertyId = propertyId;
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { guestName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.inquiry.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { inquiryDate: 'desc' },
        include: { createdBy: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.inquiry.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(id: string, tenantId: string) {
    const inquiry = await this.prisma.inquiry.findFirst({
      where: { id, property: { tenantId } },
      include: { createdBy: { select: { firstName: true, lastName: true } } },
    });
    if (!inquiry) throw new NotFoundException('Inquiry not found');
    return inquiry;
  }

  async create(dto: CreateInquiryDto, tenantId: string, createdById: string) {
    const property = await this.prisma.property.findFirst({ where: { id: dto.propertyId, tenantId }, select: { id: true } });
    if (!property) throw new NotFoundException('Property not found');

    const { propertyId, inquiryDate, eventDate, startDate, endDate, ...rest } = dto;
    return this.prisma.inquiry.create({
      data: {
        propertyId,
        createdById,
        ...rest,
        ...(inquiryDate ? { inquiryDate: new Date(inquiryDate) } : {}),
        ...(eventDate ? { eventDate: new Date(eventDate) } : {}),
        ...(startDate ? { startDate: new Date(startDate) } : {}),
        ...(endDate ? { endDate: new Date(endDate) } : {}),
      },
    });
  }

  async update(id: string, dto: UpdateInquiryDto, tenantId: string) {
    const existing = await this.prisma.inquiry.findFirst({ where: { id, property: { tenantId } }, select: { id: true } });
    if (!existing) throw new NotFoundException('Inquiry not found');

    // propertyId is never reassignable via update - it's where the inquiry lives, set once at creation.
    const { propertyId, inquiryDate, eventDate, startDate, endDate, ...rest } = dto;
    return this.prisma.inquiry.update({
      where: { id },
      data: {
        ...rest,
        ...(inquiryDate ? { inquiryDate: new Date(inquiryDate) } : {}),
        ...(eventDate !== undefined ? { eventDate: eventDate ? new Date(eventDate) : null } : {}),
        ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
      },
    });
  }

  // Finds or creates the guest this inquiry is for, and returns the seed values
  // the frontend's New Reservation dialog pre-fills itself with. The actual
  // reservation is still created through the normal reservation flow - this
  // only removes the need to retype a name/phone that's already on file here.
  async prepareConversion(id: string, tenantId: string) {
    const inquiry = await this.prisma.inquiry.findFirst({ where: { id, property: { tenantId } } });
    if (!inquiry) throw new NotFoundException('Inquiry not found');
    if (inquiry.status === 'CONVERTED') throw new BadRequestException('Inquiry has already been converted');

    let guest = await this.prisma.guest.findFirst({ where: { tenantId, phone: inquiry.phone, isDeleted: false } });
    if (!guest) {
      const [firstName, ...lastParts] = inquiry.guestName.trim().split(/\s+/);
      guest = await this.prisma.guest.create({
        data: {
          tenantId,
          firstName: firstName || inquiry.guestName,
          lastName: lastParts.join(' ') || '-',
          phone: inquiry.phone,
          email: inquiry.email ?? undefined,
        },
      });
    }

    const checkIn = inquiry.startDate ?? inquiry.eventDate ?? new Date();
    const checkOut = inquiry.endDate ?? new Date(checkIn.getTime() + 24 * 60 * 60 * 1000);

    return {
      guestId: guest.id,
      propertyId: inquiry.propertyId,
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      adults: inquiry.partySize ?? 1,
    };
  }

  async markConverted(id: string, reservationId: string, tenantId: string) {
    const existing = await this.prisma.inquiry.findFirst({ where: { id, property: { tenantId } }, select: { id: true } });
    if (!existing) throw new NotFoundException('Inquiry not found');
    return this.prisma.inquiry.update({
      where: { id },
      data: { status: 'CONVERTED', convertedReservationId: reservationId },
    });
  }
}
