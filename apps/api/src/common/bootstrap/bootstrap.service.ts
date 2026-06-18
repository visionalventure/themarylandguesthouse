import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class BootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    const existing = await this.prisma.user.findFirst({
      where: { email: 'admin@marylandguesthouse.com' },
    });
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

    this.logger.log(
      'Bootstrap complete ✓  admin@marylandguesthouse.com / Admin@123!',
    );
  }
}
