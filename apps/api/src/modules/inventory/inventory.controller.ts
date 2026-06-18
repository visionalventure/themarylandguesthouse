import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'inventory', version: '1' })
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'List inventory items' })
  getItems(@Query() query: any) {
    return this.service.getItems(query.propertyId, query);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get low stock alerts' })
  getLowStock(@Query('propertyId') propertyId: string) {
    return this.service.getLowStockAlerts(propertyId);
  }

  @Get('valuation')
  @ApiOperation({ summary: 'Get inventory valuation report' })
  getValuation(@Query('propertyId') propertyId: string) {
    return this.service.getValuationReport(propertyId);
  }

  @Post()
  @ApiOperation({ summary: 'Create inventory item' })
  createItem(@Body() dto: any) {
    return this.service.createItem(dto);
  }

  @Post('stock-in')
  @ApiOperation({ summary: 'Record stock receipt' })
  stockIn(@Body() dto: any) {
    return this.service.stockIn(dto);
  }

  @Post('stock-out')
  @ApiOperation({ summary: 'Record stock usage/issue' })
  stockOut(@Body() dto: any) {
    return this.service.stockOut(dto);
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'Get item transaction history' })
  getTransactions(@Param('id') id: string) {
    return this.service.getTransactionHistory(id);
  }
}
