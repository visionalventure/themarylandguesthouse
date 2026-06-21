import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class RestaurantService {
  constructor(private prisma: PrismaService) {}

  async getRestaurants(propertyId: string) {
    return this.prisma.restaurant.findMany({
      where: { propertyId, isActive: true },
      include: {
        _count: { select: { tables: true, orders: true } },
      },
    });
  }

  async getTables(restaurantId: string) {
    return this.prisma.restaurantTable.findMany({
      where: { restaurantId },
      orderBy: { tableNumber: 'asc' },
      include: {
        orders: {
          where: { status: { in: ['PENDING', 'PREPARING', 'READY', 'SERVED'] } },
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: { items: { include: { menuItem: { select: { name: true } } } } },
        },
      },
    });
  }

  async getMenu(restaurantId: string) {
    const categories = await this.prisma.menuCategory.findMany({
      where: { restaurantId } as any,
      orderBy: { name: 'asc' },
      include: {
        menuItems: {
          where: { isAvailable: true },
          orderBy: { name: 'asc' },
        },
      } as any,
    });

    // Also get uncategorised items
    const uncategorised = await this.prisma.menuItem.findMany({
      where: { restaurantId, categoryId: null, isAvailable: true },
      orderBy: { name: 'asc' },
    });

    return { categories, uncategorised };
  }

  async createMenuItem(restaurantId: string, dto: any) {
    return this.prisma.menuItem.create({
      data: { ...dto, restaurantId },
    });
  }

  async updateMenuItem(id: string, dto: any) {
    return this.prisma.menuItem.update({ where: { id }, data: dto });
  }

  async getOrders(restaurantId: string, query: any = {}) {
    const { status, tableId, page = 1, limit = 50 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { restaurantId };
    if (status) where.status = status;
    if (tableId) where.tableId = tableId;

    const [data, total] = await Promise.all([
      this.prisma.restaurantOrder.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          table: { select: { tableNumber: true, capacity: true } },
          items: {
            include: { menuItem: { select: { name: true, price: true } } },
          },
        },
      }),
      this.prisma.restaurantOrder.count({ where }),
    ]);

    return { data, total };
  }

  async createOrder(restaurantId: string, dto: any) {
    const { tableId, items, guestName, roomNumber, notes, orderType } = dto;

    const orderNumber = `ORD-${Date.now()}`;
    let subtotal = 0;

    // Resolve prices
    const resolvedItems = await Promise.all(
      (items || []).map(async (item: any) => {
        const menuItem = await this.prisma.menuItem.findUnique({ where: { id: item.menuItemId } });
        if (!menuItem) throw new NotFoundException(`Menu item ${item.menuItemId} not found`);
        const unitPrice = Number(menuItem.price);
        const totalPrice = unitPrice * item.quantity;
        subtotal += totalPrice;
        return { menuItemId: item.menuItemId, quantity: item.quantity, unitPrice, totalPrice, notes: item.notes };
      }),
    );

    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { propertyId: true } });
    const taxRateRecord = restaurant
      ? await this.prisma.taxRate.findFirst({ where: { tenantId: restaurant.propertyId, isActive: true }, orderBy: { createdAt: 'asc' } })
      : null;
    const taxRate = taxRateRecord ? Number(taxRateRecord.rate) / 100 : 0;
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    const order = await this.prisma.restaurantOrder.create({
      data: {
        restaurantId,
        tableId: tableId || undefined,
        orderNumber,
        guestName,
        roomNumber,
        notes,
        orderType: orderType || 'DINE_IN',
        subtotal,
        taxAmount,
        totalAmount,
        items: { create: resolvedItems },
      },
      include: {
        table: { select: { tableNumber: true } },
        items: { include: { menuItem: { select: { name: true } } } },
      },
    });

    // Mark table as occupied
    if (tableId) {
      await this.prisma.restaurantTable.update({
        where: { id: tableId },
        data: { status: 'OCCUPIED' },
      });
    }

    return order;
  }

  async updateOrderStatus(id: string, status: string) {
    const order = await this.prisma.restaurantOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const data: any = { status };
    if (status === 'PREPARING') data.preparedAt = new Date();
    if (status === 'SERVED') {
      data.servedAt = new Date();
      if (order.tableId) {
        await this.prisma.restaurantTable.update({
          where: { id: order.tableId },
          data: { status: 'AVAILABLE' },
        });
      }
    }

    return this.prisma.restaurantOrder.update({ where: { id }, data });
  }

  async moveTable(orderId: string, newTableId: string) {
    const order = await this.prisma.restaurantOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    return this.prisma.$transaction(async (tx) => {
      if (order.tableId && order.tableId !== newTableId) {
        await tx.restaurantTable.update({
          where: { id: order.tableId },
          data: { status: 'AVAILABLE' },
        });
      }
      await tx.restaurantTable.update({
        where: { id: newTableId },
        data: { status: 'OCCUPIED' },
      });
      return tx.restaurantOrder.update({
        where: { id: orderId },
        data: { tableId: newTableId },
        include: { table: { select: { tableNumber: true } }, items: { include: { menuItem: { select: { name: true } } } } },
      });
    });
  }

  async getRevenue(restaurantId: string, params: any = {}) {
    const { startDate, endDate } = params;
    const where: any = { restaurantId, status: 'SERVED' };
    if (startDate) where.createdAt = { gte: new Date(startDate) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };

    const orders = await this.prisma.restaurantOrder.findMany({
      where,
      select: { totalAmount: true, createdAt: true },
    });

    const total = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    return { total, orderCount: orders.length, orders };
  }
}
