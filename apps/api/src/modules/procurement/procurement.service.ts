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
    const { propertyId, category, ...supplierFields } = dto;
    return this.prisma.supplier.create({ data: { ...supplierFields, code } });
  }

  async updateSupplier(id: string, dto: any, tenantId: string) {
    const existing = await this.prisma.supplier.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!existing) throw new NotFoundException('Supplier not found');
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
        include: { items: true },
      }),
      this.prisma.purchaseRequest.count({ where }),
    ]);
    return { data, total };
  }

  async createPurchaseRequest(dto: any, userId?: string) {
    const count = await this.prisma.purchaseRequest.count({ where: { tenantId: dto.tenantId } });
    const requestNumber = `PR-${Date.now()}-${(count + 1).toString().padStart(4, '0')}`;
    const { items, department, notes, ...rest } = dto;
    const combinedNotes = department ? `[${department}]${notes ? ` ${notes}` : ''}` : notes;

    return this.prisma.purchaseRequest.create({
      data: {
        ...rest,
        notes: combinedNotes,
        requestNumber,
        requestedById: userId,
        status: 'PENDING_APPROVAL',
        items: items?.length ? { create: items } : undefined,
      },
      include: { items: true },
    });
  }

  async approvePurchaseRequest(id: string, action: 'APPROVED' | 'REJECTED', userId: string | undefined, tenantId: string) {
    const pr = await this.prisma.purchaseRequest.findFirst({ where: { id, tenantId } });
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

  async getPurchaseOrders(propertyId: string, tenantId: string, query: any = {}) {
    const { status, supplierId, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { propertyId, property: { tenantId } };
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

  async createPurchaseOrder(dto: any, tenantId: string) {
    const property = await this.prisma.property.findFirst({ where: { id: dto.propertyId, tenantId }, select: { id: true } });
    if (!property) throw new NotFoundException('Property not found');
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

  async updatePurchaseOrder(id: string, dto: any, tenantId: string) {
    const existing = await this.prisma.purchaseOrder.findFirst({ where: { id, property: { tenantId } }, select: { id: true } });
    if (!existing) throw new NotFoundException('Purchase order not found');
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...dto,
        receivedDate: dto.receivedDate ? new Date(dto.receivedDate) : undefined,
      },
      include: { supplier: { select: { name: true } }, lineItems: true },
    });
  }

  // ── Supplier Bills ─────────────────────────────────────────────────────────

  async getBills(tenantId: string, query: any = {}) {
    const { page = 1, limit = 20, status } = query;
    const where: any = { tenantId };
    if (status && status !== 'ALL') where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.supplierBill.findMany({
        where, skip: (Number(page) - 1) * Number(limit), take: Number(limit),
        orderBy: { billDate: 'desc' },
        include: { supplier: { select: { name: true } } },
      }),
      this.prisma.supplierBill.count({ where }),
    ]);
    return { data, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) };
  }

  async createBill(dto: any) {
    const billNumber = await this.generateBillNumber(dto.tenantId);
    const subtotal = dto.lineItems?.reduce((s: number, l: any) => s + Number(l.quantity) * Number(l.unitPrice), 0) ?? 0;
    const taxAmount = dto.lineItems?.reduce((s: number, l: any) => s + Number(l.quantity) * Number(l.unitPrice) * (Number(l.taxRate ?? 0) / 100), 0) ?? 0;
    const totalAmount = subtotal + taxAmount;

    return this.prisma.supplierBill.create({
      data: {
        tenantId: dto.tenantId,
        supplierId: dto.supplierId,
        billNumber,
        supplierRef: dto.supplierReference,
        status: 'DRAFT',
        billDate: dto.billDate ? new Date(dto.billDate) : new Date(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: dto.notes,
        subtotal,
        taxAmount,
        totalAmount,
        paidAmount: 0,
        lineItems: {
          create: (dto.lineItems ?? []).map((l: any) => ({
            description: l.description,
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
            taxRate: Number(l.taxRate ?? 0),
            total: Number(l.quantity) * Number(l.unitPrice),
          })),
        },
      },
      include: { supplier: { select: { name: true } }, lineItems: true },
    });
  }

  async approveBill(id: string, tenantId: string) {
    const bill = await this.prisma.supplierBill.findFirst({ where: { id, tenantId } });
    if (!bill) throw new NotFoundException();
    return this.prisma.supplierBill.update({ where: { id }, data: { status: 'APPROVED' } });
  }

  async markBillPaid(id: string, dto: { amount: number; method?: string; reference?: string }, tenantId: string) {
    const bill = await this.prisma.supplierBill.findFirst({ where: { id, tenantId } });
    if (!bill) throw new NotFoundException();
    const newPaid = Number(bill.paidAmount) + Number(dto.amount);
    const status = newPaid >= Number(bill.totalAmount) ? 'PAID' : 'PARTIALLY_PAID';

    return this.prisma.$transaction(async (tx) => {
      await tx.billPayment.create({
        data: {
          billId: id,
          amount: Number(dto.amount),
          method: (dto.method ?? 'CASH') as any,
          reference: dto.reference,
        },
      });
      return tx.supplierBill.update({ where: { id }, data: { paidAmount: newPaid, status } });
    });
  }

  private async generateBillNumber(tenantId: string): Promise<string> {
    const count = await this.prisma.supplierBill.count({ where: { tenantId } });
    return `BILL-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;
  }

  async createGoodsReceipt(dto: any, tenantId: string, userId?: string) {
    const { purchaseOrderId, items, notes } = dto;
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id: purchaseOrderId, property: { tenantId } }, select: { id: true } });
    if (!po) throw new NotFoundException('Purchase order not found');
    const count = await this.prisma.goodsReceipt.count();
    const receiptNumber = `GR-${Date.now()}-${(count + 1).toString().padStart(4, '0')}`;
    return this.prisma.goodsReceipt.create({
      data: {
        purchaseOrderId,
        receiptNumber,
        receivedById: userId,
        notes,
        receivedDate: new Date(),
        items: items?.length ? { create: items } : undefined,
      } as any,
      include: { items: true } as any,
    });
  }
}
