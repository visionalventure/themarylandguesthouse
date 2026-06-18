import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.property.findMany({
      where: { tenantId, isActive: true },
      include: {
        _count: { select: { rooms: true, employees: true, reservations: true } },
      },
    });
  }

  async findOne(id: string) {
    const prop = await this.prisma.property.findUnique({
      where: { id },
      include: { _count: { select: { rooms: true, employees: true } } },
    });
    if (!prop) throw new NotFoundException('Property not found');
    return prop;
  }

  async create(dto: any) {
    return this.prisma.property.create({ data: dto });
  }

  async update(id: string, dto: any, tenantId?: string) {
    try {
      return await this.prisma.property.update({
        where: { id, ...(tenantId && { tenantId }) },
        data: dto,
      });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException('Property not found');
      if (e?.code === 'P2002') throw new BadRequestException('A property with that code already exists');
      throw e;
    }
  }
}
