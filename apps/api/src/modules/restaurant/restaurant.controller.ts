import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
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
  @ApiOperation({ summary: 'Create menu item' })
  createMenuItem(@Param('id') restaurantId: string, @Body() dto: any) {
    return this.service.createMenuItem(restaurantId, dto);
  }

  @Put('menu-items/:id')
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
  @ApiOperation({ summary: 'Create order' })
  createOrder(@Param('id') restaurantId: string, @Body() dto: any) {
    return this.service.createOrder(restaurantId, dto);
  }

  @Patch('orders/:id')
  @ApiOperation({ summary: 'Update order status' })
  updateOrderStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.service.updateOrderStatus(id, status);
  }

  @Patch('orders/:id/move-table')
  @ApiOperation({ summary: 'Move order to a different table' })
  moveTable(@Param('id') id: string, @Body('tableId') tableId: string) {
    return this.service.moveTable(id, tableId);
  }

  @Get(':id/revenue')
  @ApiOperation({ summary: 'Revenue summary for date range' })
  getRevenue(@Param('id') restaurantId: string, @Query() params: any) {
    return this.service.getRevenue(restaurantId, params);
  }
}
