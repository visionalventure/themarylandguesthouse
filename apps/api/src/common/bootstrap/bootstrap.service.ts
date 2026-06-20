import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class BootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  onApplicationBootstrap() {
    // Run in background — do NOT await so app.listen() proceeds immediately
    // and Railway's health check can succeed before seeding completes.
    this.seed().catch((err: any) =>
      this.logger.error('Bootstrap seed failed:', err?.message ?? err),
    );
  }

  private async seed() {
    const existing = await this.prisma.user.findFirst({
      where: { email: 'admin@marylandguesthouse.com' },
    });

    // Always ensure reference data exists, even if admin was already seeded
    await this.seedRooms();
    await this.seedDepartments();
    await this.seedRestaurant();

    if (existing) return;

    this.logger.log('No admin user found — bootstrapping database...');

    const tenant = await this.prisma.tenant.upsert({
      where: { slug: 'maryland-guesthouse' },
      update: {},
      create: {
        name: 'Maryland Guesthouse',
        slug: 'maryland-guesthouse',
        email: 'info@marylandguesthouse.com',
        phone: '+231 777 123 456',
        address: 'Monrovia, Liberia',
        city: 'Monrovia',
        country: 'Liberia',
        currency: 'USD',
        timezone: 'Africa/Monrovia',
      },
    });

    const property = await this.prisma.property.upsert({
      where: { id: 'demo-property-id' },
      update: {},
      create: {
        id: 'demo-property-id',
        tenantId: tenant.id,
        name: 'Maryland Guesthouse - Monrovia',
        code: 'MGH-001',
        type: 'GUESTHOUSE',
        description: 'Premier guesthouse in Monrovia, Liberia',
        address: '14 Broad Street, Sinkor',
        city: 'Monrovia',
        country: 'Liberia',
        phone: '+231 777 123 456',
        email: 'reception@marylandguesthouse.com',
        starRating: 3,
        checkInTime: '14:00',
        checkOutTime: '12:00',
      },
    });

    const passwordHash = await bcrypt.hash(
      process.env.ADMIN_PASSWORD || 'Admin@123!',
      12,
    );

    await this.prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: 'admin@marylandguesthouse.com' } },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'admin@marylandguesthouse.com',
        passwordHash,
        firstName: 'System',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        emailVerified: true,
      },
    });

    await this.prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: 'manager@marylandguesthouse.com' } },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'manager@marylandguesthouse.com',
        passwordHash: await bcrypt.hash('Manager@123!', 12),
        firstName: 'Samuel',
        lastName: 'Koroma',
        role: 'MANAGER',
        emailVerified: true,
      },
    });

    // Basic chart of accounts so the app is functional on first login
    const accountSeeds = [
      { code: '1000', name: 'Cash on Hand', type: 'ASSET' },
      { code: '1100', name: 'Bank Account - Ecobank', type: 'ASSET' },
      { code: '1200', name: 'Accounts Receivable', type: 'ASSET' },
      { code: '1300', name: 'Inventory', type: 'ASSET' },
      { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
      { code: '2200', name: 'VAT Payable', type: 'LIABILITY' },
      { code: '3000', name: 'Owner Equity', type: 'EQUITY' },
      { code: '4000', name: 'Room Revenue', type: 'REVENUE' },
      { code: '4100', name: 'Food & Beverage Revenue', type: 'REVENUE' },
      { code: '5000', name: 'Salaries & Wages', type: 'EXPENSE' },
      { code: '5100', name: 'Utilities', type: 'EXPENSE' },
      { code: '5300', name: 'Repairs & Maintenance', type: 'EXPENSE' },
    ];
    for (const acct of accountSeeds) {
      await this.prisma.account.upsert({
        where: { propertyId_code: { propertyId: property.id, code: acct.code } },
        update: {},
        create: {
          propertyId: property.id,
          code: acct.code,
          name: acct.name,
          type: acct.type as any,
          normalBalance: ['ASSET', 'EXPENSE'].includes(acct.type) ? 'DEBIT' : 'CREDIT',
        },
      });
    }

    this.logger.log('Bootstrap complete ✓');
  }

  private async seedRooms() {
    const property = await this.prisma.property.findUnique({ where: { id: 'demo-property-id' } });
    if (!property) return; // property not created yet, full seed will handle rooms

    const catSeeds = [
      { id: 'cat-standard', name: 'Standard Room', type: 'SINGLE',      basePrice: 80,  maxOccupancy: 2, bedCount: 1 },
      { id: 'cat-double',   name: 'Double Room',   type: 'DOUBLE',      basePrice: 120, maxOccupancy: 2, bedCount: 2 },
      { id: 'cat-twin',     name: 'Twin Room',     type: 'TWIN',        basePrice: 110, maxOccupancy: 2, bedCount: 2 },
      { id: 'cat-suite',    name: 'Suite',         type: 'SUITE',       basePrice: 200, maxOccupancy: 3, bedCount: 1 },
      { id: 'cat-family',   name: 'Family Room',   type: 'FAMILY_ROOM', basePrice: 180, maxOccupancy: 4, bedCount: 2 },
    ];
    for (const cat of catSeeds) {
      await this.prisma.roomCategory.upsert({
        where: { id: cat.id },
        update: {},
        create: { id: cat.id, propertyId: property.id, name: cat.name, type: cat.type as any, basePrice: cat.basePrice, maxOccupancy: cat.maxOccupancy, bedCount: cat.bedCount },
      });
    }

    const roomSeeds = [
      { id: 'room-101', roomNumber: '101', floor: 1, categoryId: 'cat-standard' },
      { id: 'room-102', roomNumber: '102', floor: 1, categoryId: 'cat-standard' },
      { id: 'room-103', roomNumber: '103', floor: 1, categoryId: 'cat-double'   },
      { id: 'room-201', roomNumber: '201', floor: 2, categoryId: 'cat-twin'     },
      { id: 'room-202', roomNumber: '202', floor: 2, categoryId: 'cat-double'   },
      { id: 'room-301', roomNumber: '301', floor: 3, categoryId: 'cat-suite'    },
      { id: 'room-302', roomNumber: '302', floor: 3, categoryId: 'cat-family'   },
    ];
    for (const room of roomSeeds) {
      await this.prisma.room.upsert({
        where: { id: room.id },
        update: {},
        create: { id: room.id, propertyId: property.id, roomNumber: room.roomNumber, floor: room.floor, categoryId: room.categoryId },
      });
    }

    this.logger.log('Room seed complete ✓  7 rooms across 5 categories');
  }

  private async seedDepartments() {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: 'maryland-guesthouse' } });
    if (!tenant) return;

    const depts = [
      { code: 'MGMT', name: 'Management' },
      { code: 'FD',   name: 'Front Desk & Reservations' },
      { code: 'HK',   name: 'Housekeeping' },
      { code: 'FNB',  name: 'Food & Beverage' },
      { code: 'MNT',  name: 'Maintenance & Engineering' },
      { code: 'FIN',  name: 'Finance & Accounting' },
      { code: 'HR',   name: 'Human Resources' },
      { code: 'SEC',  name: 'Security' },
      { code: 'PROC', name: 'Procurement' },
      { code: 'IT',   name: 'IT & Systems' },
    ];

    for (const d of depts) {
      await this.prisma.department.upsert({
        where: { tenantId_code: { tenantId: tenant.id, code: d.code } },
        update: {},
        create: { tenantId: tenant.id, code: d.code, name: d.name },
      });
    }

    this.logger.log('Department seed complete ✓  10 departments');
  }

  private async seedRestaurant() {
    const property = await this.prisma.property.findUnique({ where: { id: 'demo-property-id' } });
    if (!property) return;

    const existing = await this.prisma.restaurant.findFirst({ where: { propertyId: property.id } });
    if (existing) return;

    const restaurant = await this.prisma.restaurant.create({
      data: {
        propertyId: property.id,
        name: 'Maryland Restaurant & Bar',
        type: 'RESTAURANT',
        description: 'In-house dining and bar service',
        isActive: true,
      },
    });

    // Seed tables
    const tables = [
      { tableNumber: 'T1', capacity: 2, location: 'Indoor' },
      { tableNumber: 'T2', capacity: 2, location: 'Indoor' },
      { tableNumber: 'T3', capacity: 4, location: 'Indoor' },
      { tableNumber: 'T4', capacity: 4, location: 'Indoor' },
      { tableNumber: 'T5', capacity: 4, location: 'Indoor' },
      { tableNumber: 'T6', capacity: 6, location: 'Indoor' },
      { tableNumber: 'T7', capacity: 6, location: 'Terrace' },
      { tableNumber: 'T8', capacity: 8, location: 'Terrace' },
      { tableNumber: 'B1', capacity: 2, location: 'Bar' },
      { tableNumber: 'B2', capacity: 2, location: 'Bar' },
    ];

    for (const t of tables) {
      await this.prisma.restaurantTable.upsert({
        where: { restaurantId_tableNumber: { restaurantId: restaurant.id, tableNumber: t.tableNumber } },
        update: {},
        create: { restaurantId: restaurant.id, ...t },
      });
    }

    // Seed basic menu items
    const menuItems = [
      { name: 'Continental Breakfast',   price: 15, isVegetarian: true  },
      { name: 'Full English Breakfast',  price: 20 },
      { name: 'Club Sandwich',           price: 12 },
      { name: 'Grilled Chicken',         price: 18 },
      { name: 'Jollof Rice & Chicken',   price: 14 },
      { name: 'Grilled Fish',            price: 16 },
      { name: 'Vegetable Stir Fry',      price: 10, isVegetarian: true, isVegan: true },
      { name: 'Garden Salad',            price: 8,  isVegetarian: true, isVegan: true },
      { name: 'Chocolate Cake',          price: 6,  isVegetarian: true  },
      { name: 'Fresh Fruit Bowl',        price: 7,  isVegetarian: true, isVegan: true },
      { name: 'Soft Drink (Can)',        price: 2 },
      { name: 'Fresh Juice',             price: 4,  isVegetarian: true, isVegan: true },
      { name: 'Bottled Water',           price: 1,  isVegetarian: true, isVegan: true },
      { name: 'Local Beer',             price: 3 },
      { name: 'House Wine (Glass)',      price: 8 },
    ];

    for (const item of menuItems) {
      await this.prisma.menuItem.create({
        data: {
          restaurantId: restaurant.id,
          name: item.name,
          price: item.price,
          isAvailable: true,
          isVegetarian: item.isVegetarian ?? false,
          isVegan: item.isVegan ?? false,
        },
      });
    }

    this.logger.log('Restaurant seed complete ✓  1 restaurant, 10 tables, 15 menu items');
  }
}
