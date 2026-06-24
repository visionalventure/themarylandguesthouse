import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RestaurantService } from './restaurant.service';

@ApiTags('restaurant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'restaurant', version: '1' })
export class RestaurantController {
  constructor(private readonly service: RestaurantService) {}

  @Get()
  @ApiOperation({ summary: 'List restaurants for property' })
  getRestaurants(@Query('propertyId') propertyId: string) {
    return this.service.getRestaurants(propertyId);
  }

  @Get(':id/tables')
  @ApiOperation({ summary: 'Get table layout with current status' })
  getTables(@Param('id') id: string) {
    return this.service.getTables(id);
  }

  @Get(':id/menu')
  @ApiOperation({ summary: 'Get full menu by category' })
  getMenu(@Param('id') id: string) {
    return this.service.getMenu(id);
  }

  @Post(':id/menu-items')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create menu item' })
  createMenuItem(@Param('id') restaurantId: string, @Body() dto: any) {
    return this.service.createMenuItem(restaurantId, dto);
  }

  @Put('menu-items/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update menu item' })
  updateMenuItem(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateMenuItem(id, dto);
  }

  @Get(':id/orders')
  @ApiOperation({ summary: 'List orders with filters' })
  getOrders(@Param('id') restaurantId: string, @Query() query: any) {
    return this.service.getOrders(restaurantId, query);
  }

  @Post(':id/orders')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Create order' })
  createOrder(@Param('id') restaurantId: string, @Body() dto: any) {
    return this.service.createOrder(restaurantId, dto);
  }

  @Patch('orders/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Update order status' })
  updateOrderStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.service.updateOrderStatus(id, status);
  }

  @Patch('orders/:id/move-table')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Move order to a different table' })
  moveTable(@Param('id') id: string, @Body('tableId') tableId: string) {
    return this.service.moveTable(id, tableId);
  }

  @Get(':id/revenue')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Revenue summary for date range' })
  getRevenue(@Param('id') restaurantId: string, @Query() params: any) {
    return this.service.getRevenue(restaurantId, params);
  }
}
