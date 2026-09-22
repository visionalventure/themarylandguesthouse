import { Module } from '@nestjs/common';
import { OwnerController } from './owner.controller';
import { OwnerService } from './owner.service';
import { DashboardModule } from '../dashboard/dashboard.module';
import { AccountingModule } from '../accounting/accounting.module';
import { HrModule } from '../hr/hr.module';
import { DocumentsModule } from '../documents/documents.module';
import { ReportsModule } from '../reports/reports.module';
import { RestaurantModule } from '../restaurant/restaurant.module';

@Module({
  imports: [DashboardModule, AccountingModule, HrModule, DocumentsModule, ReportsModule, RestaurantModule],
  controllers: [OwnerController],
  providers: [OwnerService],
})
export class OwnerModule {}
