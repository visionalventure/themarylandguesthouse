import { Injectable, NotFoundException } from '@nestjs/common';
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

  async update(id: string, dto: any) {
    return this.prisma.property.update({ where: { id }, data: dto });
  }
}
