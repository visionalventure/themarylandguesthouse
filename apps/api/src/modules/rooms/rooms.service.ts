import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async findAll(propertyId: string, query: any = {}) {
    const { status, type, floor } = query;
    const where: any = { propertyId, isActive: true };
    if (status) where.status = status;
    if (floor) where.floor = Number(floor);
    if (type) where.category = { type };

    return this.prisma.room.findMany({
      where,
      include: { category: true },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });
  }

  async findAvailable(propertyId: string, checkIn: Date, checkOut: Date) {
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
        isActive: true,
        status: { in: ['AVAILABLE', 'CLEANING'] },
        id: { notIn: occupiedIds },
      },
      include: { category: true, roomPricing: { where: { isDefault: true } } },
    });
  }

  async findOne(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
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

  async updateStatus(id: string, status: string) {
    return this.prisma.room.update({ where: { id }, data: { status: status as any } });
  }

  async create(dto: any) {
    const { propertyId, categoryId, roomNumber, floor, notes } = dto;
    return this.prisma.room.create({
      data: { propertyId, categoryId, roomNumber, floor, ...(notes ? { notes } : {}) },
      include: { category: true },
    });
  }

  async update(id: string, dto: any) {
    const allowed = ['categoryId', 'roomNumber', 'floor', 'status', 'notes', 'isActive', 'lastCleaned', 'lastInspected'];
    const data: any = {};
    for (const key of allowed) {
      if (key in dto) data[key] = dto[key];
    }
    return this.prisma.room.update({ where: { id }, data, include: { category: true } });
  }

  async getCategories(propertyId: string) {
    return this.prisma.roomCategory.findMany({ where: { propertyId } });
  }

  async getRoomPricing(roomId: string) {
    return this.prisma.roomPricing.findMany({
      where: { roomId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async createRoomPricing(roomId: string, dto: any) {
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

  async updateRoomPricing(pricingId: string, dto: any) {
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

    return this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        const pricing = await tx.roomPricing.findUnique({ where: { id: pricingId } });
        if (pricing) {
          await tx.roomPricing.updateMany({ where: { roomId: pricing.roomId, isDefault: true }, data: { isDefault: false } });
        }
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

  async deleteRoomPricing(pricingId: string) {
    return this.prisma.roomPricing.delete({ where: { id: pricingId } });
  }
}
