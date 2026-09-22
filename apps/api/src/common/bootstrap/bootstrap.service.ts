import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { generateStrongPassword } from '../utils/generate-password';

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

    // Always ensure reference data exists, even if admin was already seeded.
    // Each step runs independently of the others' success - e.g. seedRooms()
    // throws if a room was manually renumbered to collide with a seed id,
    // and that must never block seedChartOfAccounts()/backfillPaymentJournalEntries()
    // from running on the same boot.
    await this.runSeedStep('seedRooms', () => this.seedRooms());
    await this.runSeedStep('seedDepartments', () => this.seedDepartments());
    await this.runSeedStep('seedRestaurant', () => this.seedRestaurant());
    await this.runSeedStep('seedChartOfAccounts', () => this.seedChartOfAccounts());
    await this.runSeedStep('backfillPaymentJournalEntries', () => this.backfillPaymentJournalEntries());

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

    await this.prisma.property.upsert({
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

    const isProduction = process.env.NODE_ENV === 'production';

    let adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      adminPassword = isProduction ? generateStrongPassword() : 'Admin@123!';
      if (isProduction) {
        this.logger.warn(
          `ADMIN_PASSWORD not set — generated one-time password for admin@marylandguesthouse.com: ${adminPassword}`,
        );
      }
    }

    let managerPassword = process.env.MANAGER_PASSWORD;
    if (!managerPassword) {
      managerPassword = isProduction ? generateStrongPassword() : 'Manager@123!';
      if (isProduction) {
        this.logger.warn(
          `MANAGER_PASSWORD not set — generated one-time password for manager@marylandguesthouse.com: ${managerPassword}`,
        );
      }
    }

    await this.prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: 'admin@marylandguesthouse.com' } },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'admin@marylandguesthouse.com',
        passwordHash: await bcrypt.hash(adminPassword, 12),
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
        passwordHash: await bcrypt.hash(managerPassword, 12),
        firstName: 'Samuel',
        lastName: 'Koroma',
        role: 'MANAGER',
        emailVerified: true,
      },
    });

    // Property was just created above - the unconditional call earlier in
    // seed() ran before it existed and no-opped, so seed its accounts now.
    await this.runSeedStep('seedChartOfAccounts', () => this.seedChartOfAccounts());

    this.logger.log('Bootstrap complete ✓');
  }

  private async runSeedStep(name: string, fn: () => Promise<void>) {
    try {
      await fn();
    } catch (err: any) {
      this.logger.error(`${name} failed:`, err?.message ?? err);
    }
  }

  // Runs unconditionally on every boot (not just first-ever bootstrap) -
  // this used to be nested inside the admin-already-exists early return, so
  // on a production database whose admin user predates this GL seeding, it
  // silently never ran and left the property with no Chart of Accounts.
  // Without accounts coded 1000/4000, folio.service.ts's payment-journal-entry
  // step has nothing to post to and skips silently, so collected payments
  // showed on the Dashboard (which reads Payment rows directly) but never
  // reached Accounting's P&L (which only reads posted journal entries).
  private async seedChartOfAccounts() {
    const property = await this.prisma.property.findUnique({ where: { id: 'demo-property-id' } });
    if (!property) return; // property not created yet, full seed will handle this below

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

    this.logger.log('Chart of accounts seed complete ✓  12 accounts');
  }

  // Catches up any payment collected before seedChartOfAccounts() above ran
  // for its property - those posted no journal entry at the time (GL
  // accounts didn't exist yet), so they'd show on the Dashboard forever but
  // never in Accounting. One-time per payment - once a journal entry with
  // its receipt number exists, it's excluded on every future boot.
  private async backfillPaymentJournalEntries() {
    const payments = await this.prisma.payment.findMany({
      where: { status: 'COMPLETED', receiptNumber: { not: null }, reservationId: { not: null } },
      include: { reservation: { select: { propertyId: true } } },
    });
    if (payments.length === 0) return;

    const receiptNumbers = payments.map((p) => p.receiptNumber as string);
    const existing = await this.prisma.journalEntry.findMany({
      where: { referenceType: 'PAYMENT', reference: { in: receiptNumbers } },
      select: { reference: true },
    });
    const covered = new Set(existing.map((e) => e.reference));
    const missing = payments.filter((p) => p.reservation && !covered.has(p.receiptNumber));
    if (missing.length === 0) return;

    for (const payment of missing) {
      const propertyId = payment.reservation!.propertyId;
      const [cashAccount, revenueAccount] = await Promise.all([
        this.prisma.account.findFirst({ where: { propertyId, code: '1000', isActive: true } }),
        this.prisma.account.findFirst({ where: { propertyId, code: '4000', isActive: true } }),
      ]);
      if (!cashAccount || !revenueAccount) continue; // this property still has no chart of accounts - try again next boot

      const year = new Date(payment.createdAt).getFullYear();
      const count = await this.prisma.journalEntry.count({ where: { tenantId: payment.tenantId } });
      await this.prisma.journalEntry.create({
        data: {
          tenantId: payment.tenantId,
          entryNumber: `JE-${year}-${String(count + 1).padStart(5, '0')}`,
          status: 'POSTED',
          date: payment.processedAt ?? payment.createdAt,
          description: `Payment received — Receipt ${payment.receiptNumber}`,
          reference: payment.receiptNumber,
          referenceType: 'PAYMENT',
          totalDebit: payment.amount,
          totalCredit: payment.amount,
          lines: {
            create: [
              { accountId: cashAccount.id,    type: 'DEBIT',  amount: payment.amount, description: `Cash receipt ${payment.receiptNumber}` },
              { accountId: revenueAccount.id, type: 'CREDIT', amount: payment.amount, description: `Room revenue ${payment.receiptNumber}` },
            ],
          },
        },
      });
    }

    this.logger.log(`Backfilled ${missing.length} payment journal entr${missing.length === 1 ? 'y' : 'ies'} ✓`);
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

    // Only seed the demo rooms into a property that has none at all - once
    // any room exists (whether from this seed or created/deleted by a real
    // user), never touch the room list again. Upserting these fixed IDs on
    // every boot would otherwise resurrect a room a user intentionally
    // hard-deleted, since the upsert can no longer find that id and falls
    // through to re-creating it.
    const existingRoomCount = await this.prisma.room.count({ where: { propertyId: property.id } });
    if (existingRoomCount === 0) {
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
        await this.prisma.room.create({
          data: { id: room.id, propertyId: property.id, roomNumber: room.roomNumber, floor: room.floor, categoryId: room.categoryId },
        });
      }
      this.logger.log('Room seed complete ✓  7 rooms across 5 categories');
    }
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
