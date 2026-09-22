import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FolioService } from '../folio/folio.service';

@Injectable()
export class RestaurantService {
  constructor(
    private prisma: PrismaService,
    private readonly folioService: FolioService,
  ) {}

  async getRestaurants(propertyId: string, tenantId: string) {
    return this.prisma.restaurant.findMany({
      where: { propertyId, isActive: true, property: { tenantId } },
      include: {
        _count: { select: { tables: true, orders: true } },
      },
    });
  }

  private async assertRestaurantInTenant(restaurantId: string, tenantId: string) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId, property: { tenantId } },
      select: { id: true, propertyId: true },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return restaurant;
  }

  async getTables(restaurantId: string, tenantId: string) {
    await this.assertRestaurantInTenant(restaurantId, tenantId);
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

  async createTable(restaurantId: string, dto: any, tenantId: string) {
    await this.assertRestaurantInTenant(restaurantId, tenantId);
    try {
      return await this.prisma.restaurantTable.create({
        data: { restaurantId, tableNumber: dto.tableNumber, capacity: dto.capacity, status: dto.status ?? 'AVAILABLE', location: dto.location },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new BadRequestException(`Table ${dto.tableNumber} already exists for this restaurant`);
      throw e;
    }
  }

  async updateTable(id: string, dto: any, tenantId: string) {
    const existing = await this.prisma.restaurantTable.findFirst({ where: { id, restaurant: { property: { tenantId } } }, select: { id: true } });
    if (!existing) throw new NotFoundException('Table not found');
    try {
      return await this.prisma.restaurantTable.update({ where: { id }, data: dto });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new BadRequestException(`Table ${dto.tableNumber} already exists for this restaurant`);
      throw e;
    }
  }

  async getMenu(restaurantId: string, tenantId: string) {
    await this.assertRestaurantInTenant(restaurantId, tenantId);
    // Returns every item, available or not, so the Menu management view can
    // see and re-enable a hidden item - callers that should only offer
    // orderable items (the New Order dialog) filter isAvailable themselves.
    const categories = await this.prisma.menuCategory.findMany({
      where: { tenantId } as any,
      orderBy: { name: 'asc' },
      include: {
        items: {
          where: { restaurantId },
          orderBy: { name: 'asc' },
        },
      } as any,
    });

    // Also get uncategorised items
    const uncategorised = await this.prisma.menuItem.findMany({
      where: { restaurantId, categoryId: null },
      orderBy: { name: 'asc' },
    });

    return { categories, uncategorised };
  }

  async createMenuItem(restaurantId: string, dto: any, tenantId: string) {
    await this.assertRestaurantInTenant(restaurantId, tenantId);
    return this.prisma.menuItem.create({
      data: { ...dto, restaurantId },
    });
  }

  async updateMenuItem(id: string, dto: any, tenantId: string) {
    const existing = await this.prisma.menuItem.findFirst({
      where: { id, restaurant: { property: { tenantId } } },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Menu item not found');
    return this.prisma.menuItem.update({ where: { id }, data: dto });
  }

  async deleteMenuItem(id: string, tenantId: string) {
    const existing = await this.prisma.menuItem.findFirst({
      where: { id, restaurant: { property: { tenantId } } },
      select: { id: true, _count: { select: { orderItems: true } } },
    });
    if (!existing) throw new NotFoundException('Menu item not found');

    // An item that's been ordered before can't be hard-deleted without
    // breaking those past orders' line items - hide it from the menu instead.
    if (existing._count.orderItems > 0) {
      await this.prisma.menuItem.update({ where: { id }, data: { isAvailable: false } });
      return { deleted: false, hidden: true };
    }
    await this.prisma.menuItem.delete({ where: { id } });
    return { deleted: true, hidden: false };
  }

  async getOrders(restaurantId: string, tenantId: string, query: any = {}) {
    await this.assertRestaurantInTenant(restaurantId, tenantId);
    const { status, tableId, page = 1, limit = 50 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { restaurantId };
    if (status) {
      const statuses = String(status).split(',').map((s: string) => s.trim()).filter(Boolean);
      where.status = statuses.length > 1 ? { in: statuses } : statuses[0];
    }
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

  async createOrder(restaurantId: string, dto: any, tenantId: string) {
    const restaurant = await this.assertRestaurantInTenant(restaurantId, tenantId);
    const { tableId, reservationId, items, notes } = dto;

    let guestName = dto.guestName;
    let roomNumber = dto.roomNumber;
    let orderType = dto.orderType || 'DINE_IN';

    if (reservationId) {
      if (tableId) throw new BadRequestException('An order cannot have both a table and a room-service reservation');
      const reservation = await this.prisma.reservation.findFirst({
        where: { id: reservationId, status: 'CHECKED_IN', propertyId: restaurant.propertyId, property: { tenantId } },
        include: { guest: true, rooms: { include: { room: true } } },
      });
      if (!reservation) throw new NotFoundException('No checked-in reservation found for that room/guest');
      guestName = `${reservation.guest.firstName} ${reservation.guest.lastName}`.trim();
      roomNumber = reservation.rooms[0]?.room?.roomNumber;
      orderType = 'ROOM_SERVICE';
    }

    const orderNumber = `ORD-${Date.now()}`;
    let subtotal = 0;

    // Resolve prices
    const resolvedItems = await Promise.all(
      (items || []).map(async (item: any) => {
        const menuItem = await this.prisma.menuItem.findFirst({ where: { id: item.menuItemId, restaurantId } });
        if (!menuItem) throw new NotFoundException(`Menu item ${item.menuItemId} not found`);
        const unitPrice = Number(menuItem.price);
        const totalPrice = unitPrice * item.quantity;
        subtotal += totalPrice;
        return { menuItemId: item.menuItemId, quantity: item.quantity, unitPrice, totalPrice, notes: item.notes };
      }),
    );

    const taxRateRecord = await this.prisma.taxRate.findFirst({ where: { tenantId, isActive: true }, orderBy: { createdAt: 'asc' } });
    const taxRate = taxRateRecord ? Number(taxRateRecord.rate) / 100 : 0;
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    if (tableId) {
      const table = await this.prisma.restaurantTable.findFirst({ where: { id: tableId, restaurantId }, select: { id: true } });
      if (!table) throw new NotFoundException('Table not found');
    }

    const order = await this.prisma.restaurantOrder.create({
      data: {
        restaurantId,
        tableId: tableId || undefined,
        reservationId: reservationId || undefined,
        orderNumber,
        guestName,
        roomNumber,
        notes,
        orderType,
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

  async updateOrderStatus(id: string, status: string, tenantId: string, paymentMethod?: string, chargeToRoom?: boolean) {
    const order = await this.prisma.restaurantOrder.findFirst({
      where: { id, restaurant: { property: { tenantId } } },
      include: { restaurant: { select: { propertyId: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    // Closing the bill is the moment the sale actually happens - it must
    // either be paid for now, or charged to the guest's room folio to
    // settle at checkout, so accounting has something real to post (now
    // or later).
    if (status === 'SERVED') {
      if (paymentMethod && chargeToRoom) {
        throw new BadRequestException('Choose either a payment method or Charge to Room, not both');
      }
      if (!paymentMethod && !chargeToRoom) {
        throw new BadRequestException('A payment method or Charge to Room is required to close the bill');
      }
      if (chargeToRoom && !order.reservationId) {
        throw new BadRequestException("This order isn't linked to a room and can't be charged to room");
      }
    }

    const data: any = { status };
    if (status === 'PREPARING') data.preparedAt = new Date();
    if (status === 'SERVED') {
      data.servedAt = new Date();
      if (chargeToRoom) data.chargeToRoom = true;
      if (order.tableId) {
        await this.prisma.restaurantTable.update({
          where: { id: order.tableId },
          data: { status: 'AVAILABLE' },
        });
      }
    }

    const updated = await this.prisma.restaurantOrder.update({ where: { id }, data });

    if (status === 'SERVED' && paymentMethod) {
      const receiptNumber = await this.folioService.generateReceiptNumber();
      const payment = await this.prisma.payment.create({
        data: {
          tenantId,
          restaurantOrderId: order.id,
          amount: order.totalAmount,
          method: paymentMethod as any,
          status: 'COMPLETED',
          receiptNumber,
          processedAt: new Date(),
        },
      });
      await this.folioService
        .createPaymentJournalEntry(payment, order.restaurant.propertyId, tenantId, {
          revenueAccountCode: '4100',
          revenueLabel: 'Food & Beverage revenue',
        })
        .catch(() => null);
    }

    if (status === 'SERVED' && chargeToRoom) {
      const charge = await this.folioService.postCharge(
        order.reservationId!,
        {
          chargeType: 'F&B',
          description: `Room Service — Order ${order.orderNumber}`,
          amount: Number(order.totalAmount),
        },
        tenantId,
      );
      await this.prisma.reservationCharge.update({ where: { id: charge.id }, data: { orderId: order.id } });
    }

    return updated;
  }

  async moveTable(orderId: string, newTableId: string, tenantId: string) {
    const order = await this.prisma.restaurantOrder.findFirst({ where: { id: orderId, restaurant: { property: { tenantId } } } });
    if (!order) throw new NotFoundException('Order not found');
    const newTable = await this.prisma.restaurantTable.findFirst({ where: { id: newTableId, restaurantId: order.restaurantId }, select: { id: true } });
    if (!newTable) throw new NotFoundException('Table not found');

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

  async getRevenue(restaurantId: string, tenantId: string, params: any = {}) {
    await this.assertRestaurantInTenant(restaurantId, tenantId);
    const { startDate, endDate } = params;
    const where: any = { restaurantId, status: 'SERVED' };
    if (startDate) where.servedAt = { gte: new Date(startDate) };
    if (endDate) where.servedAt = { ...where.servedAt, lte: new Date(endDate) };

    const orders = await this.prisma.restaurantOrder.findMany({
      where,
      orderBy: { servedAt: 'desc' },
      include: {
        table: { select: { tableNumber: true } },
        items: { include: { menuItem: { select: { name: true } } } },
        payments: { select: { method: true, amount: true } },
      },
    });

    const total = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    const itemTotals = new Map<string, { quantity: number; revenue: number }>();
    for (const order of orders) {
      for (const item of order.items) {
        const key = item.menuItem?.name ?? 'Unknown item';
        const current = itemTotals.get(key) ?? { quantity: 0, revenue: 0 };
        current.quantity += item.quantity;
        current.revenue += Number(item.totalPrice);
        itemTotals.set(key, current);
      }
    }
    const topItems = [...itemTotals.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const dayTotals = new Map<string, number>();
    for (const order of orders) {
      const day = (order.servedAt ?? order.createdAt).toISOString().slice(0, 10);
      dayTotals.set(day, (dayTotals.get(day) ?? 0) + Number(order.totalAmount));
    }
    const dailyRevenue = [...dayTotals.entries()]
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { total, orderCount: orders.length, orders, topItems, dailyRevenue };
  }
}
