import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { GuestsModule } from './modules/guests/guests.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { HousekeepingModule } from './modules/housekeeping/housekeeping.module';
import { RestaurantModule } from './modules/restaurant/restaurant.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { HrModule } from './modules/hr/hr.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { ReportsModule } from './modules/reports/reports.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { SettingsModule } from './modules/settings/settings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    PropertiesModule,
    DashboardModule,
    ReservationsModule,
    GuestsModule,
    RoomsModule,
    HousekeepingModule,
    RestaurantModule,
    InventoryModule,
    ProcurementModule,
    HrModule,
    MaintenanceModule,
    AccountingModule,
    DocumentsModule,
    LoyaltyModule,
    ReportsModule,
    SettingsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
