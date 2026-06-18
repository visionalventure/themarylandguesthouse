import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getItems(propertyId: string, query: any = {}) {
    const { search, categoryId, lowStock, page = 1, limit = 20 } = query;
    const where: any = { propertyId, isActive: true };
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where, skip: (Number(page) - 1) * Number(limit), take: Number(limit),
        include: { category: true, supplier: { select: { name: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    const withAlerts = data.map((item) => ({
      ...item,
      isLowStock: Number(item.currentStock) <= Number(item.reorderPoint),
    }));

    return { data: withAlerts, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) };
  }

  async getLowStockAlerts(propertyId: string) {
    return this.prisma.inventoryItem.findMany({
      where: { propertyId, isActive: true },
      include: { category: true },
    }).then((items) => items.filter((i) => Number(i.currentStock) <= Number(i.reorderPoint)));
  }

  async stockIn(dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.update({
        where: { id: dto.itemId },
        data: {
          currentStock: { increment: dto.quantity },
          unitCost: dto.unitCost || undefined,
          totalValue: { increment: dto.quantity * (dto.unitCost || 0) },
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          itemId: dto.itemId,
          type: 'STOCK_IN',
          quantity: dto.quantity,
          unitCost: dto.unitCost,
          totalCost: dto.quantity * (dto.unitCost || 0),
          referenceId: dto.referenceId,
          referenceType: dto.referenceType,
          batchNumber: dto.batchNumber,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
          notes: dto.notes,
          performedBy: dto.performedBy,
        },
      });

      return item;
    });
  }

  async stockOut(dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id: dto.itemId } });
      if (!item || Number(item.currentStock) < dto.quantity) {
        throw new Error('Insufficient stock');
      }

      const updated = await tx.inventoryItem.update({
        where: { id: dto.itemId },
        data: { currentStock: { decrement: dto.quantity } },
      });

      await tx.inventoryTransaction.create({
        data: {
          itemId: dto.itemId,
          type: dto.type || 'STOCK_OUT',
          quantity: -dto.quantity,
          reason: dto.reason,
          notes: dto.notes,
          performedBy: dto.performedBy,
        },
      });

      return updated;
    });
  }

  async getTransactionHistory(itemId: string) {
    return this.prisma.inventoryTransaction.findMany({
      where: { itemId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async createItem(dto: any) {
    return this.prisma.inventoryItem.create({ data: dto });
  }

  async getValuationReport(propertyId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { propertyId, isActive: true },
      include: { category: true },
    });

    const total = items.reduce((sum, i) => sum + Number(i.totalValue), 0);
    const byCategory: Record<string, number> = {};
    items.forEach((i) => {
      const cat = i.category?.name || 'Uncategorized';
      byCategory[cat] = (byCategory[cat] || 0) + Number(i.totalValue);
    });

    return { totalValue: total, byCategory, items: items.slice(0, 50) };
  }
}
