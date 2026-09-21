import { Module } from '@nestjs/common';
import { FolioModule } from '../folio/folio.module';
import { ShortStayController } from './short-stay.controller';
import { ShortStayService } from './short-stay.service';

@Module({
  imports: [FolioModule],
  controllers: [ShortStayController],
  providers: [ShortStayService],
})
export class ShortStayModule {}
