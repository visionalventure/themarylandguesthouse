import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class MaintenanceService {
  constructor(private prisma: PrismaService) {}

  private async nextWorkOrderNumber(tenantId: string): Promise<string> {
    const count = await this.prisma.workOrder.count({ where: { tenantId } });
    return `WO-${Date.now()}-${(count + 1).toString().padStart(4, '0')}`;
  }

  async getWorkOrders(propertyId: string, query: any = {}) {
    const { status, priority, roomId, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { tenantId: propertyId }; // using propertyId as tenantId fallback
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (roomId) where.roomId = roomId;

    const [data, total] = await Promise.all([
      this.prisma.workOrder.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          room: { select: { roomNumber: true, floor: true } },
          asset: { select: { name: true, assetNumber: true } },
        },
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    return { data, total };
  }

  async createWorkOrder(dto: any) {
    const workOrderNumber = await this.nextWorkOrderNumber(dto.tenantId || dto.propertyId);
    return this.prisma.workOrder.create({
      data: {
        ...dto,
        workOrderNumber,
        status: 'PENDING',
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
      },
      include: {
        room: { select: { roomNumber: true } },
        asset: { select: { name: true } },
      },
    });
  }

  async updateWorkOrder(id: string, dto: any) {
    const wo = await this.prisma.workOrder.findUnique({ where: { id } });
    if (!wo) throw new NotFoundException('Work order not found');

    const data: any = { ...dto };
    if (dto.status === 'IN_PROGRESS' && !wo.startedAt) data.startedAt = new Date();
    if (dto.status === 'COMPLETED') {
      data.completedAt = new Date();
      if (wo.assetId) {
        await this.prisma.asset.update({
          where: { id: wo.assetId },
          data: { lastMaintenanceDate: new Date() } as any,
        });
      }
    }

    return this.prisma.workOrder.update({
      where: { id },
      data,
      include: {
        room: { select: { roomNumber: true } },
        asset: { select: { name: true } },
      },
    });
  }

  async getAssets(propertyId: string, query: any = {}) {
    const { category, status, page = 1, limit = 50 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { propertyId };
    if (category) where.category = category;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { name: 'asc' },
      }),
      this.prisma.asset.count({ where }),
    ]);
    return { data, total };
  }

  async createAsset(dto: any) {
    const count = await this.prisma.asset.count({ where: { propertyId: dto.propertyId } });
    const assetNumber = `AST-${(count + 1).toString().padStart(4, '0')}`;
    return this.prisma.asset.create({
      data: {
        ...dto,
        assetNumber,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
      },
    });
  }

  async updateAsset(id: string, dto: any) {
    return this.prisma.asset.update({
      where: { id },
      data: {
        ...dto,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
      },
    });
  }

  async getSchedule(propertyId: string) {
    return this.prisma.maintenanceSchedule.findMany({
      where: { propertyId } as any,
      orderBy: { nextDueDate: 'asc' } as any,
      take: 50,
    });
  }
}
