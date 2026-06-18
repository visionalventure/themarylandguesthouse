'use strict';
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Maryland Guesthouse ERP database...\n');

  // Tenant
  console.log('Creating tenant...');
  const tenant = await prisma.tenant.upsert({
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

  // Property
  console.log('Creating property...');
  const property = await prisma.property.upsert({
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

  // Users
  console.log('Creating users...');
  const adminHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123!', 12);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@marylandguesthouse.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@marylandguesthouse.com',
      passwordHash: adminHash,
      firstName: 'System',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      emailVerified: true,
    },
  });

  const managerHash = await bcrypt.hash('Manager@123!', 12);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'manager@marylandguesthouse.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'manager@marylandguesthouse.com',
      passwordHash: managerHash,
      firstName: 'Samuel',
      lastName: 'Koroma',
      role: 'MANAGER',
      emailVerified: true,
    },
  });

  const fdHash = await bcrypt.hash('Desk@123!', 12);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'frontdesk@marylandguesthouse.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'frontdesk@marylandguesthouse.com',
      passwordHash: fdHash,
      firstName: 'Mary',
      lastName: 'Johnson',
      role: 'FRONT_DESK',
      emailVerified: true,
    },
  });

  // Room Categories
  console.log('Creating room categories...');
  await Promise.all([
    prisma.roomCategory.upsert({
      where: { id: 'cat-single' },
      update: {},
      create: {
        id: 'cat-single',
        propertyId: property.id,
        name: 'Standard Single',
        type: 'SINGLE',
        description: 'Comfortable single room with all amenities',
        basePrice: 75,
        maxOccupancy: 1,
        bedCount: 1,
        amenities: ['WiFi', 'Air Conditioning', 'TV', 'Bathroom', 'Fan'],
      },
    }),
    prisma.roomCategory.upsert({
      where: { id: 'cat-double' },
      update: {},
      create: {
        id: 'cat-double',
        propertyId: property.id,
        name: 'Deluxe Double',
        type: 'DOUBLE',
        description: 'Spacious double room with premium furnishings',
        basePrice: 120,
        maxOccupancy: 2,
        bedCount: 1,
        amenities: ['WiFi', 'Air Conditioning', 'TV', 'Bathroom', 'Mini Fridge', 'Safe'],
      },
    }),
    prisma.roomCategory.upsert({
      where: { id: 'cat-twin' },
      update: {},
      create: {
        id: 'cat-twin',
        propertyId: property.id,
        name: 'Twin Room',
        type: 'TWIN',
        description: 'Two single beds, perfect for business travelers',
        basePrice: 110,
        maxOccupancy: 2,
        bedCount: 2,
        amenities: ['WiFi', 'Air Conditioning', 'TV', 'Bathroom', 'Work Desk'],
      },
    }),
    prisma.roomCategory.upsert({
      where: { id: 'cat-suite' },
      update: {},
      create: {
        id: 'cat-suite',
        propertyId: property.id,
        name: 'Executive Suite',
        type: 'SUITE',
        description: 'Luxurious suite with separate living area and premium amenities',
        basePrice: 220,
        maxOccupancy: 3,
        bedCount: 1,
        amenities: ['WiFi', 'Air Conditioning', 'Smart TV', 'Bathroom', 'Kitchenette', 'Living Area', 'Safe', 'Mini Bar'],
      },
    }),
    prisma.roomCategory.upsert({
      where: { id: 'cat-family' },
      update: {},
      create: {
        id: 'cat-family',
        propertyId: property.id,
        name: 'Family Room',
        type: 'FAMILY_ROOM',
        description: 'Large room ideal for families',
        basePrice: 180,
        maxOccupancy: 5,
        bedCount: 3,
        amenities: ['WiFi', 'Air Conditioning', 'TV', 'Bathroom', 'Mini Fridge'],
      },
    }),
  ]);

  // Rooms
  console.log('Creating rooms...');
  const roomData = [
    { number: '101', floor: 1, categoryId: 'cat-single', status: 'AVAILABLE' },
    { number: '102', floor: 1, categoryId: 'cat-single', status: 'OCCUPIED' },
    { number: '103', floor: 1, categoryId: 'cat-double', status: 'AVAILABLE' },
    { number: '104', floor: 1, categoryId: 'cat-twin', status: 'CLEANING' },
    { number: '201', floor: 2, categoryId: 'cat-double', status: 'AVAILABLE' },
    { number: '202', floor: 2, categoryId: 'cat-double', status: 'OCCUPIED' },
    { number: '203', floor: 2, categoryId: 'cat-twin', status: 'AVAILABLE' },
    { number: '204', floor: 2, categoryId: 'cat-family', status: 'RESERVED' },
    { number: '301', floor: 3, categoryId: 'cat-suite', status: 'AVAILABLE' },
    { number: '302', floor: 3, categoryId: 'cat-suite', status: 'OCCUPIED' },
    { number: '303', floor: 3, categoryId: 'cat-double', status: 'MAINTENANCE' },
    { number: '304', floor: 3, categoryId: 'cat-twin', status: 'AVAILABLE' },
  ];

  for (const room of roomData) {
    await prisma.room.upsert({
      where: { propertyId_roomNumber: { propertyId: property.id, roomNumber: room.number } },
      update: {},
      create: {
        propertyId: property.id,
        categoryId: room.categoryId,
        roomNumber: room.number,
        floor: room.floor,
        status: room.status,
      },
    });
  }

  // Chart of Accounts
  console.log('Creating chart of accounts...');
  const accounts = [
    { code: '1000', name: 'Cash on Hand', type: 'ASSET' },
    { code: '1010', name: 'Petty Cash', type: 'ASSET' },
    { code: '1100', name: 'Bank Account - Ecobank', type: 'ASSET' },
    { code: '1110', name: 'Bank Account - UBA', type: 'ASSET' },
    { code: '1200', name: 'Accounts Receivable - Guests', type: 'ASSET' },
    { code: '1210', name: 'Accounts Receivable - Corporate', type: 'ASSET' },
    { code: '1300', name: 'Inventory - Food & Beverage', type: 'ASSET' },
    { code: '1310', name: 'Inventory - Operating Supplies', type: 'ASSET' },
    { code: '1500', name: 'Property & Equipment', type: 'ASSET' },
    { code: '1510', name: 'Accumulated Depreciation', type: 'ASSET' },
    { code: '2000', name: 'Accounts Payable - Suppliers', type: 'LIABILITY' },
    { code: '2100', name: 'Accrued Salaries', type: 'LIABILITY' },
    { code: '2200', name: 'VAT Payable', type: 'LIABILITY' },
    { code: '2300', name: 'Guest Deposits', type: 'LIABILITY' },
    { code: '2400', name: 'Bank Loan', type: 'LIABILITY' },
    { code: '3000', name: 'Owner Equity', type: 'EQUITY' },
    { code: '3100', name: 'Retained Earnings', type: 'EQUITY' },
    { code: '3200', name: 'Current Year Earnings', type: 'EQUITY' },
    { code: '4000', name: 'Room Revenue', type: 'REVENUE' },
    { code: '4010', name: 'Suite Revenue', type: 'REVENUE' },
    { code: '4100', name: 'Food Revenue', type: 'REVENUE' },
    { code: '4110', name: 'Beverage Revenue', type: 'REVENUE' },
    { code: '4200', name: 'Event Revenue', type: 'REVENUE' },
    { code: '4300', name: 'Laundry Revenue', type: 'REVENUE' },
    { code: '4900', name: 'Other Revenue', type: 'REVENUE' },
    { code: '5000', name: 'Salaries & Wages', type: 'EXPENSE' },
    { code: '5010', name: 'Employee Benefits', type: 'EXPENSE' },
    { code: '5100', name: 'Electricity', type: 'EXPENSE' },
    { code: '5110', name: 'Water', type: 'EXPENSE' },
    { code: '5120', name: 'Generator Fuel', type: 'EXPENSE' },
    { code: '5200', name: 'Food & Beverage Cost', type: 'EXPENSE' },
    { code: '5300', name: 'Repairs & Maintenance', type: 'EXPENSE' },
    { code: '5400', name: 'Marketing & Advertising', type: 'EXPENSE' },
    { code: '5500', name: 'Office Supplies', type: 'EXPENSE' },
    { code: '5600', name: 'Depreciation', type: 'EXPENSE' },
    { code: '5700', name: 'Insurance', type: 'EXPENSE' },
    { code: '5800', name: 'Professional Fees', type: 'EXPENSE' },
    { code: '5900', name: 'Bank Charges', type: 'EXPENSE' },
    { code: '5950', name: 'Miscellaneous Expenses', type: 'EXPENSE' },
  ];

  for (const account of accounts) {
    await prisma.account.upsert({
      where: { propertyId_code: { propertyId: property.id, code: account.code } },
      update: {},
      create: {
        propertyId: property.id,
        code: account.code,
        name: account.name,
        type: account.type,
        normalBalance: ['ASSET', 'EXPENSE'].includes(account.type) ? 'DEBIT' : 'CREDIT',
      },
    });
  }

  // Departments
  console.log('Creating departments...');
  const depts = [
    { code: 'FO', name: 'Front Office' },
    { code: 'HK', name: 'Housekeeping' },
    { code: 'FB', name: 'Food & Beverage' },
    { code: 'MNT', name: 'Maintenance' },
    { code: 'ACC', name: 'Accounting' },
    { code: 'HR', name: 'Human Resources' },
    { code: 'SEC', name: 'Security' },
    { code: 'MGT', name: 'Management' },
  ];

  for (const dept of depts) {
    await prisma.department.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: dept.code } },
      update: {},
      create: { tenantId: tenant.id, code: dept.code, name: dept.name },
    });
  }

  // Sample Guests
  console.log('Creating sample guests...');
  const guestData = [
    { firstName: 'James', lastName: 'Wilson', email: 'james.wilson@example.com', phone: '+1 555 123 4567', nationality: 'US', totalStays: 8, totalSpent: 2400 },
    { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.j@example.com', phone: '+1 555 234 5678', nationality: 'US', totalStays: 3, totalSpent: 840 },
    { firstName: 'Emmanuel', lastName: 'Kamara', email: 'e.kamara@email.com', phone: '+231 777 987 654', nationality: 'LR', totalStays: 15, totalSpent: 4200 },
    { firstName: 'Amara', lastName: 'Sesay', email: 'amara@gmail.com', phone: '+232 76 123 456', nationality: 'SL', totalStays: 1, totalSpent: 180 },
    { firstName: 'Chen', lastName: 'Wei', email: 'chen.wei@corp.com', phone: '+86 138 0013 8000', nationality: 'CN', totalStays: 5, totalSpent: 1850 },
  ];

  for (const guest of guestData) {
    const created = await prisma.guest.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: guest.email } },
      update: {},
      create: {
        tenantId: tenant.id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        phone: guest.phone,
        nationality: guest.nationality,
        totalStays: guest.totalStays,
        totalSpent: guest.totalSpent,
      },
    });

    const tier =
      guest.totalStays >= 10 ? 'PLATINUM' :
      guest.totalStays >= 5 ? 'GOLD' :
      guest.totalStays >= 3 ? 'SILVER' : 'BRONZE';

    await prisma.loyaltyAccount.upsert({
      where: { guestId: created.id },
      update: {},
      create: {
        guestId: created.id,
        tier,
        points: guest.totalSpent,
        lifetimePoints: guest.totalSpent,
        memberNumber: `MGH-${String(Math.floor(Math.random() * 90000) + 10000)}`,
      },
    });
  }

  // Tax Rates
  console.log('Creating tax rates...');
  await prisma.taxRate.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'GST-10' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Goods & Services Tax',
      code: 'GST-10',
      rate: 10,
      type: 'GST',
      isDefault: true,
    },
  });

  await prisma.taxRate.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'WHT-5' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Withholding Tax',
      code: 'WHT-5',
      rate: 5,
      type: 'WITHHOLDING',
    },
  });

  // Restaurant
  console.log('Creating restaurant...');
  const restaurant = await prisma.restaurant.upsert({
    where: { id: 'demo-restaurant-id' },
    update: {},
    create: {
      id: 'demo-restaurant-id',
      propertyId: property.id,
      name: 'Maryland Dining',
      type: 'RESTAURANT',
      description: 'Main restaurant serving breakfast, lunch and dinner',
    },
  });

  for (let i = 1; i <= 10; i++) {
    const tableNum = `T${i.toString().padStart(2, '0')}`;
    await prisma.restaurantTable.upsert({
      where: { restaurantId_tableNumber: { restaurantId: restaurant.id, tableNumber: tableNum } },
      update: {},
      create: {
        restaurantId: restaurant.id,
        tableNumber: tableNum,
        capacity: i <= 4 ? 2 : i <= 7 ? 4 : 6,
      },
    });
  }

  const menuCat = await prisma.menuCategory.upsert({
    where: { id: 'cat-breakfast' },
    update: {},
    create: {
      id: 'cat-breakfast',
      tenantId: tenant.id,
      name: 'Breakfast',
      sortOrder: 1,
    },
  });

  const menuItems = [
    { name: 'Full English Breakfast', price: 12, description: 'Eggs, bacon, toast, beans' },
    { name: 'Continental Breakfast', price: 8, description: 'Pastries, juice, coffee' },
    { name: 'Grilled Chicken', price: 18, description: 'With rice and vegetables' },
    { name: 'Beef Stew', price: 15, description: 'With fufu and greens' },
    { name: 'Jollof Rice & Chicken', price: 14, description: 'West African classic' },
    { name: 'Fresh Fruit Juice', price: 4, description: 'Pineapple, mango or orange' },
    { name: 'Local Beer', price: 3, description: 'Chilled Club Beer' },
    { name: 'Soft Drink', price: 2, description: 'Coke, Fanta, Sprite' },
  ];

  for (const item of menuItems) {
    const id = `menu-${item.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
    await prisma.menuItem.upsert({
      where: { id },
      update: {},
      create: {
        id,
        restaurantId: restaurant.id,
        categoryId: menuCat.id,
        name: item.name,
        description: item.description,
        price: item.price,
        costPrice: item.price * 0.35,
      },
    });
  }

  console.log('\nDatabase seeded successfully!\n');
  console.log('Tenant: Maryland Guesthouse');
  console.log('Property: MGH-001 (12 rooms across 3 floors)');
  console.log('Admin: admin@marylandguesthouse.com / Admin@123!');
  console.log('Manager: manager@marylandguesthouse.com / Manager@123!');
  console.log('Front Desk: frontdesk@marylandguesthouse.com / Desk@123!');
  console.log('Chart of Accounts: 38 accounts');
  console.log('Sample Guests: 5 guests with loyalty accounts');
  console.log('Restaurant: Maryland Dining with 10 tables & 8 menu items\n');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
