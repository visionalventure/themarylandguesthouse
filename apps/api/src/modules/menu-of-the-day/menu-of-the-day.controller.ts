import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { MenuOfTheDayService } from './menu-of-the-day.service';
import { UpsertMenuOfTheDayDto, CreateMenuOfTheDayEntryDto, UpdateMenuOfTheDayEntryDto } from './dto/menu-of-the-day.dto';

@ApiTags('menu-of-the-day')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'menu-of-the-day', version: '1' })
export class MenuOfTheDayController {
  constructor(private readonly service: MenuOfTheDayService) {}

  @Get(':restaurantId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RESTAURANT_STAFF', 'FRONT_DESK')
  @ApiOperation({ summary: "Get a restaurant's menu of the day for a date (defaults to today)" })
  getForDate(@Param('restaurantId') restaurantId: string, @Query('date') date: string, @Request() req: any) {
    return this.service.getForDate(restaurantId, req.user.tenantId, date);
  }

  @Put(':restaurantId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create or update the menu of the day for a date' })
  upsert(@Param('restaurantId') restaurantId: string, @Body() dto: UpsertMenuOfTheDayDto, @Request() req: any) {
    return this.service.upsertForDate(restaurantId, req.user.tenantId, dto, req.user.sub);
  }

  @Post(':menuOfTheDayId/entries')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Add an entry — from the permanent menu, or a freeform one-off special' })
  addEntry(@Param('menuOfTheDayId') menuOfTheDayId: string, @Body() dto: CreateMenuOfTheDayEntryDto, @Request() req: any) {
    return this.service.addEntry(menuOfTheDayId, req.user.tenantId, dto);
  }

  @Put('entries/:entryId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a menu of the day entry' })
  updateEntry(@Param('entryId') entryId: string, @Body() dto: UpdateMenuOfTheDayEntryDto, @Request() req: any) {
    return this.service.updateEntry(entryId, req.user.tenantId, dto);
  }

  @Delete('entries/:entryId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Remove a menu of the day entry' })
  removeEntry(@Param('entryId') entryId: string, @Request() req: any) {
    return this.service.removeEntry(entryId, req.user.tenantId);
  }

  @Post(':menuOfTheDayId/send')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: "WhatsApp today's menu to every currently checked-in guest with a phone number" })
  send(@Param('menuOfTheDayId') menuOfTheDayId: string, @Request() req: any) {
    return this.service.sendToCheckedInGuests(menuOfTheDayId, req.user.tenantId);
  }
}
