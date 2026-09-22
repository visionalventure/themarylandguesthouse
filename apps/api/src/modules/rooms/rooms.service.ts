import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async findAll(propertyId: string, tenantId: string, query: any = {}) {
    const { status, type, floor, search } = query;
    const where: any = { propertyId, isActive: true, property: { tenantId } };
    if (status) where.status = status;
    if (floor) where.floor = Number(floor);
    if (type) where.category = { type };
    if (search) where.roomNumber = { contains: search, mode: 'insensitive' };

    return this.prisma.room.findMany({
      where,
      include: { category: true },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });
  }

  async findAvailable(propertyId: string, tenantId: string, checkIn: Date, checkOut: Date) {
    const occupied = await this.prisma.reservationRoom.findMany({
      where: {
        reservation: {
          propertyId,
          status: { in: ['RESERVED', 'CONFIRMED', 'CHECKED_IN'] },
          checkIn: { lte: checkOut },
          checkOut: { gte: checkIn },
        },
      },
      select: { roomId: true },
    });

    const occupiedIds = occupied.map((r) => r.roomId);

    return this.prisma.room.findMany({
      where: {
        propertyId,
        property: { tenantId },
        isActive: true,
        status: { in: ['AVAILABLE', 'CLEANING'] },
        id: { notIn: occupiedIds },
      },
      include: { category: true, roomPricing: { where: { isDefault: true } } },
    });
  }

  async findOne(id: string, tenantId: string) {
    const room = await this.prisma.room.findFirst({
      where: { id, property: { tenantId } },
      include: {
        category: true,
        roomPricing: true,
        housekeepingTasks: { where: { status: { in: ['PENDING', 'IN_PROGRESS'] } }, take: 5 },
        maintenanceWorkOrders: { where: { status: { in: ['PENDING', 'IN_PROGRESS'] } }, take: 5 },
      },
    });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async updateStatus(id: string, status: string, tenantId: string) {
    const existing = await this.prisma.room.findFirst({ where: { id, property: { tenantId } }, select: { id: true } });
    if (!existing) throw new NotFoundException('Room not found');
    return this.prisma.room.update({ where: { id }, data: { status: status as any } });
  }

  async create(dto: any, tenantId: string) {
    const { propertyId, categoryId, roomNumber, floor, notes, amenities } = dto;
    const property = await this.prisma.property.findFirst({ where: { id: propertyId, tenantId }, select: { id: true } });
    if (!property) throw new BadRequestException('Invalid propertyId');
    return this.prisma.room.create({
      data: { propertyId, categoryId, roomNumber, floor, amenities: amenities ?? [], ...(notes ? { notes } : {}) },
      include: { category: true },
    });
  }

  async update(id: string, dto: any, tenantId: string) {
    const existing = await this.prisma.room.findFirst({ where: { id, property: { tenantId } }, select: { id: true } });
    if (!existing) throw new NotFoundException('Room not found');
    const allowed = ['categoryId', 'roomNumber', 'floor', 'status', 'notes', 'isActive', 'lastCleaned', 'lastInspected', 'amenities'];
    const data: any = {};
    for (const key of allowed) {
      if (key in dto) data[key] = dto[key];
    }
    return this.prisma.room.update({ where: { id }, data, include: { category: true } });
  }

  async getCategories(propertyId: string, tenantId: string, type?: string) {
    const property = await this.prisma.property.findFirst({ where: { id: propertyId, tenantId }, select: { id: true } });
    if (!property) return [];
    return this.prisma.roomCategory.findMany({ where: { propertyId, ...(type ? { type: type as any } : {}) } });
  }

  async createCategory(dto: any, tenantId: string) {
    const { propertyId, name, type, description, basePrice, maxOccupancy, bedCount, amenities, hourlyRate, isShortStayEligible } = dto;
    const property = await this.prisma.property.findFirst({ where: { id: propertyId, tenantId }, select: { id: true } });
    if (!property) throw new BadRequestException('Invalid propertyId');
    return this.prisma.roomCategory.create({
      data: {
        propertyId,
        name,
        type,
        description,
        basePrice: Number(basePrice),
        maxOccupancy: Number(maxOccupancy),
        bedCount: Number(bedCount ?? 1),
        amenities: amenities ?? [],
        hourlyRate: hourlyRate != null ? Number(hourlyRate) : undefined,
        isShortStayEligible: isShortStayEligible ?? false,
      },
    });
  }

  async updateCategory(id: string, dto: any, tenantId: string) {
    const category = await this.prisma.roomCategory.findUnique({ where: { id }, select: { propertyId: true } });
    if (!category) throw new NotFoundException('Room category not found');
    const property = await this.prisma.property.findFirst({ where: { id: category.propertyId, tenantId }, select: { id: true } });
    if (!property) throw new NotFoundException('Room category not found');
    const allowed = ['name', 'type', 'description', 'basePrice', 'maxOccupancy', 'bedCount', 'amenities', 'hourlyRate', 'isShortStayEligible'];
    const numericKeys = ['basePrice', 'maxOccupancy', 'bedCount', 'hourlyRate'];
    const data: any = {};
    for (const key of allowed) {
      if (key in dto) data[key] = numericKeys.includes(key) && dto[key] != null ? Number(dto[key]) : dto[key];
    }
    return this.prisma.roomCategory.update({ where: { id }, data });
  }

  async getRoomPricing(roomId: string, tenantId: string) {
    const room = await this.prisma.room.findFirst({ where: { id: roomId, property: { tenantId } }, select: { id: true } });
    if (!room) throw new NotFoundException('Room not found');
    return this.prisma.roomPricing.findMany({
      where: { roomId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async createRoomPricing(roomId: string, dto: any, tenantId: string) {
    const room = await this.prisma.room.findFirst({ where: { id: roomId, property: { tenantId } }, select: { id: true } });
    if (!room) throw new NotFoundException('Room not found');

    const { name, pricePerNight, startDate, endDate, isDefault, minNights } = dto;

    const parsedPrice = Number(pricePerNight);
    if (isNaN(parsedPrice) || parsedPrice <= 0) throw new BadRequestException('pricePerNight must be a positive number');

    const parsedMinNights = Number(minNights ?? 1);
    if (!Number.isInteger(parsedMinNights) || parsedMinNights < 1) throw new BadRequestException('minNights must be a positive integer');

    let parsedStart: Date | null = null;
    let parsedEnd: Date | null = null;
    if (startDate) {
      parsedStart = new Date(startDate);
      if (isNaN(parsedStart.getTime())) throw new BadRequestException('startDate is not a valid date');
    }
    if (endDate) {
      parsedEnd = new Date(endDate);
      if (isNaN(parsedEnd.getTime())) throw new BadRequestException('endDate is not a valid date');
    }
    if (parsedStart && parsedEnd && parsedEnd < parsedStart) throw new BadRequestException('endDate must be on or after startDate');

    if (isDefault) {
      await this.prisma.roomPricing.updateMany({ where: { roomId, isDefault: true }, data: { isDefault: false } });
    }
    return this.prisma.roomPricing.create({
      data: {
        roomId,
        name,
        pricePerNight: parsedPrice,
        startDate: parsedStart,
        endDate: parsedEnd,
        isDefault: isDefault ?? false,
        minNights: parsedMinNights,
      },
    });
  }

  async updateRoomPricing(pricingId: string, dto: any, tenantId: string) {
    const { name, pricePerNight, startDate, endDate, isDefault, minNights } = dto;

    if (pricePerNight !== undefined) {
      const p = Number(pricePerNight);
      if (isNaN(p) || p <= 0) throw new BadRequestException('pricePerNight must be a positive number');
    }
    if (minNights !== undefined) {
      const m = Number(minNights);
      if (!Number.isInteger(m) || m < 1) throw new BadRequestException('minNights must be a positive integer');
    }
    if (startDate != null) {
      const d = new Date(startDate);
      if (isNaN(d.getTime())) throw new BadRequestException('startDate is not a valid date');
    }
    if (endDate != null) {
      const d = new Date(endDate);
      if (isNaN(d.getTime())) throw new BadRequestException('endDate is not a valid date');
    }

    const existing = await this.prisma.roomPricing.findFirst({ where: { id: pricingId, room: { property: { tenantId } } } });
    if (!existing) throw new NotFoundException('Room pricing not found');

    return this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.roomPricing.updateMany({ where: { roomId: existing.roomId, isDefault: true }, data: { isDefault: false } });
      }
      return tx.roomPricing.update({
        where: { id: pricingId },
        data: {
          ...(name !== undefined && { name }),
          ...(pricePerNight !== undefined && { pricePerNight: Number(pricePerNight) }),
          ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
          ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
          ...(isDefault !== undefined && { isDefault }),
          ...(minNights !== undefined && { minNights: Number(minNights) }),
        },
      });
    });
  }

  async deleteRoomPricing(pricingId: string, tenantId: string) {
    const existing = await this.prisma.roomPricing.findFirst({ where: { id: pricingId, room: { property: { tenantId } } }, select: { id: true } });
    if (!existing) throw new NotFoundException('Room pricing not found');
    return this.prisma.roomPricing.delete({ where: { id: pricingId } });
  }
}
