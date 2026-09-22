import { Module } from '@nestjs/common';
import { FolioModule } from '../folio/folio.module';
import { RestaurantController } from './restaurant.controller';
import { RestaurantService } from './restaurant.service';

@Module({ imports: [FolioModule], controllers: [RestaurantController], providers: [RestaurantService] })
export class RestaurantModule {}
