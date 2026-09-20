import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ProcurementService } from './procurement.service';
import {
  SuppliersQueryDto, CreateSupplierDto, UpdateSupplierDto,
  PurchaseRequestsQueryDto, CreatePurchaseRequestDto, ApprovePurchaseRequestDto,
  PurchaseOrdersQueryDto, CreatePurchaseOrderDto, UpdatePurchaseOrderDto,
  CreateGoodsReceiptDto, BillsQueryDto, CreateBillDto, MarkBillPaidDto,
} from './dto/procurement.dto';

@ApiTags('procurement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'procurement', version: '1' })
export class ProcurementController {
  constructor(private readonly service: ProcurementService) {}

  @Get('suppliers')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'List suppliers' })
  getSuppliers(@Query() query: SuppliersQueryDto, @Request() req: any) {
    return this.service.getSuppliers(req.user.tenantId, query);
  }

  @Post('suppliers')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create supplier' })
  createSupplier(@Body() dto: CreateSupplierDto, @Request() req: any) {
    return this.service.createSupplier({ ...dto, tenantId: req.user.tenantId });
  }

  @Put('suppliers/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update supplier' })
  updateSupplier(@Param('id') id: string, @Body() dto: UpdateSupplierDto, @Request() req: any) {
    return this.service.updateSupplier(id, dto, req.user.tenantId);
  }

  @Get('purchase-requests')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'List purchase requests' })
  getPurchaseRequests(@Query() query: PurchaseRequestsQueryDto, @Request() req: any) {
    return this.service.getPurchaseRequests(req.user.tenantId, query);
  }

  @Post('purchase-requests')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Create purchase request' })
  createPurchaseRequest(@Body() dto: CreatePurchaseRequestDto, @Request() req: any) {
    return this.service.createPurchaseRequest({ ...dto, tenantId: req.user.tenantId }, req.user?.sub);
  }

  @Patch('purchase-requests/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Approve or reject purchase request' })
  approvePurchaseRequest(@Param('id') id: string, @Body() dto: ApprovePurchaseRequestDto, @Request() req: any) {
    return this.service.approvePurchaseRequest(id, dto.action, req.user?.sub, req.user.tenantId);
  }

  @Get('purchase-orders')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'List purchase orders' })
  getPurchaseOrders(@Query() query: PurchaseOrdersQueryDto, @Request() req: any) {
    return this.service.getPurchaseOrders(query.propertyId, req.user.tenantId, query);
  }

  @Post('purchase-orders')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create purchase order' })
  createPurchaseOrder(@Body() dto: CreatePurchaseOrderDto, @Request() req: any) {
    return this.service.createPurchaseOrder(dto, req.user.tenantId);
  }

  @Patch('purchase-orders/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update purchase order status' })
  updatePurchaseOrder(@Param('id') id: string, @Body() dto: UpdatePurchaseOrderDto, @Request() req: any) {
    return this.service.updatePurchaseOrder(id, dto, req.user.tenantId);
  }

  @Post('goods-receipts')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Record goods receipt against PO' })
  createGoodsReceipt(@Body() dto: CreateGoodsReceiptDto, @Request() req: any) {
    return this.service.createGoodsReceipt(dto, req.user.tenantId, req.user?.sub);
  }

  @Get('bills')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'List supplier bills' })
  getBills(@Query() query: BillsQueryDto, @Request() req: any) {
    return this.service.getBills(req.user.tenantId, query);
  }

  @Post('bills')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Create supplier bill' })
  createBill(@Body() dto: CreateBillDto, @Request() req: any) {
    return this.service.createBill({ ...dto, tenantId: req.user.tenantId });
  }

  @Patch('bills/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Approve supplier bill' })
  approveBill(@Param('id') id: string, @Request() req: any) {
    return this.service.approveBill(id, req.user.tenantId);
  }

  @Patch('bills/:id/mark-paid')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Record payment against bill' })
  markBillPaid(@Param('id') id: string, @Body() dto: MarkBillPaidDto, @Request() req: any) {
    return this.service.markBillPaid(id, dto, req.user.tenantId);
  }
}
