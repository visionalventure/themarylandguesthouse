import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RestaurantService } from './restaurant.service';

@ApiTags('restaurant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'restaurant', version: '1' })
export class RestaurantController {
  constructor(private readonly service: RestaurantService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RESTAURANT_STAFF', 'FRONT_DESK')
  @ApiOperation({ summary: 'List restaurants for property' })
  getRestaurants(@Query('propertyId') propertyId: string, @Request() req: any) {
    return this.service.getRestaurants(propertyId, req.user.tenantId);
  }

  @Get(':id/tables')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RESTAURANT_STAFF', 'FRONT_DESK')
  @ApiOperation({ summary: 'Get table layout with current status' })
  getTables(@Param('id') id: string, @Request() req: any) {
    return this.service.getTables(id, req.user.tenantId);
  }

  @Get(':id/menu')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RESTAURANT_STAFF', 'FRONT_DESK')
  @ApiOperation({ summary: 'Get full menu by category' })
  getMenu(@Param('id') id: string, @Request() req: any) {
    return this.service.getMenu(id, req.user.tenantId);
  }

  @Post(':id/menu-items')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create menu item' })
  createMenuItem(@Param('id') restaurantId: string, @Body() dto: any, @Request() req: any) {
    return this.service.createMenuItem(restaurantId, dto, req.user.tenantId);
  }

  @Put('menu-items/:id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update menu item' })
  updateMenuItem(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.updateMenuItem(id, dto, req.user.tenantId);
  }

  @Get(':id/orders')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RESTAURANT_STAFF', 'FRONT_DESK')
  @ApiOperation({ summary: 'List orders with filters' })
  getOrders(@Param('id') restaurantId: string, @Query() query: any, @Request() req: any) {
    return this.service.getOrders(restaurantId, req.user.tenantId, query);
  }

  @Post(':id/orders')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK', 'RESTAURANT_STAFF')
  @ApiOperation({ summary: 'Create order' })
  createOrder(@Param('id') restaurantId: string, @Body() dto: any, @Request() req: any) {
    return this.service.createOrder(restaurantId, dto, req.user.tenantId);
  }

  @Patch('orders/:id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK', 'RESTAURANT_STAFF')
  @ApiOperation({ summary: 'Update order status' })
  updateOrderStatus(@Param('id') id: string, @Body('status') status: string, @Request() req: any) {
    return this.service.updateOrderStatus(id, status, req.user.tenantId);
  }

  @Patch('orders/:id/move-table')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK', 'RESTAURANT_STAFF')
  @ApiOperation({ summary: 'Move order to a different table' })
  moveTable(@Param('id') id: string, @Body('tableId') tableId: string, @Request() req: any) {
    return this.service.moveTable(id, tableId, req.user.tenantId);
  }

  @Get(':id/revenue')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Revenue summary for date range' })
  getRevenue(@Param('id') restaurantId: string, @Query() params: any, @Request() req: any) {
    return this.service.getRevenue(restaurantId, req.user.tenantId, params);
  }
}
