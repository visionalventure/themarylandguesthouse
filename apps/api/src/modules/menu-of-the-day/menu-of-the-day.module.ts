import { Module } from '@nestjs/common';
import { RestaurantModule } from '../restaurant/restaurant.module';
import { MenuOfTheDayController } from './menu-of-the-day.controller';
import { MenuOfTheDayService } from './menu-of-the-day.service';

@Module({
  imports: [RestaurantModule],
  controllers: [MenuOfTheDayController],
  providers: [MenuOfTheDayService],
  exports: [MenuOfTheDayService],
})
export class MenuOfTheDayModule {}
