import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { FolioModule } from '../folio/folio.module';

@Module({
  imports: [NotificationsModule, FolioModule],
  controllers: [ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
