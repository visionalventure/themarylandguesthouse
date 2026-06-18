import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ProcurementService {
  constructor(private prisma: PrismaService) {}

  // ── Suppliers ──────────────────────────────────────────────────────────────

  async getSuppliers(tenantId: string, query: any = {}) {
    const { search, page = 1, limit = 50 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId, isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where, skip, take: Number(limit), orderBy: { name: 'asc' },
        include: { _count: { select: { purchaseOrders: true } } },
      }),
      this.prisma.supplier.count({ where }),
    ]);
    return { data, total };
  }

  async createSupplier(dto: any) {
    const count = await this.prisma.supplier.count({ where: { tenantId: dto.tenantId } });
    const code = dto.code || `SUP-${(count + 1).toString().padStart(4, '0')}`;
    return this.prisma.supplier.create({ data: { ...dto, code } });
  }

  async updateSupplier(id: string, dto: any) {
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  // ── Purchase Requests ──────────────────────────────────────────────────────

  async getPurchaseRequests(tenantId: string, query: any = {}) {
    const { status, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.purchaseRequest.findMany({
        where, skip, take: Number(limit), orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          requestedBy: { select: { firstName: true, lastName: true } },
        } as any,
      }),
      this.prisma.purchaseRequest.count({ where }),
    ]);
    return { data, total };
  }

  async createPurchaseRequest(dto: any, userId?: string) {
    const count = await this.prisma.purchaseRequest.count({ where: { tenantId: dto.tenantId } });
    const requestNumber = `PR-${Date.now()}-${(count + 1).toString().padStart(4, '0')}`;
    const { items, ...rest } = dto;

    return this.prisma.purchaseRequest.create({
      data: {
        ...rest,
        requestNumber,
        requestedById: userId,
        status: 'PENDING_APPROVAL',
        items: items?.length ? { create: items } : undefined,
      },
      include: { items: true },
    });
  }

  async approvePurchaseRequest(id: string, action: 'APPROVED' | 'REJECTED', userId?: string) {
    const pr = await this.prisma.purchaseRequest.findUnique({ where: { id } });
    if (!pr) throw new NotFoundException('Purchase request not found');
    return this.prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: action,
        approvedById: userId,
        approvedAt: new Date(),
      },
    });
  }

  // ── Purchase Orders ────────────────────────────────────────────────────────

  async getPurchaseOrders(propertyId: string, query: any = {}) {
    const { status, supplierId, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { propertyId };
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where, skip, take: Number(limit), orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { name: true, code: true } },
          lineItems: true,
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return { data, total };
  }

  async createPurchaseOrder(dto: any) {
    const count = await this.prisma.purchaseOrder.count({ where: { propertyId: dto.propertyId } });
    const poNumber = `PO-${Date.now()}-${(count + 1).toString().padStart(4, '0')}`;
    const { lineItems, ...rest } = dto;

    return this.prisma.purchaseOrder.create({
      data: {
        ...rest,
        poNumber,
        status: 'DRAFT',
        orderDate: new Date(),
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        lineItems: lineItems?.length ? { create: lineItems } : undefined,
      },
      include: { supplier: { select: { name: true } }, lineItems: true },
    });
  }

  async updatePurchaseOrder(id: string, dto: any) {
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...dto,
        receivedDate: dto.receivedDate ? new Date(dto.receivedDate) : undefined,
      },
      include: { supplier: { select: { name: true } }, lineItems: true },
    });
  }

  async createGoodsReceipt(dto: any) {
    const { purchaseOrderId, items, receivedById, notes } = dto;
    return this.prisma.goodsReceipt.create({
      data: {
        purchaseOrderId,
        receivedById,
        notes,
        receivedDate: new Date(),
        items: items?.length ? { create: items } : undefined,
      } as any,
      include: { items: true } as any,
    });
  }
}
