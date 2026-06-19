import { Module } from '@nestjs/common';
import { NightAuditController } from './nightaudit.controller';
import { NightAuditService } from './nightaudit.service';

@Module({
  controllers: [NightAuditController],
  providers: [NightAuditService],
  exports: [NightAuditService],
})
export class NightAuditModule {}
