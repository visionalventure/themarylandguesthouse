import { Module } from '@nestjs/common';
import { NightAuditController } from './nightaudit.controller';
import { NightAuditService } from './nightaudit.service';
import { ReportsModule } from '../reports/reports.module';
import { RestaurantModule } from '../restaurant/restaurant.module';
import { HrModule } from '../hr/hr.module';

@Module({
  imports: [ReportsModule, RestaurantModule, HrModule],
  controllers: [NightAuditController],
  providers: [NightAuditService],
  exports: [NightAuditService],
})
export class NightAuditModule {}
