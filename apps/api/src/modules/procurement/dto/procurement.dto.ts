import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsEnum, IsInt, IsNumber, IsArray, ValidateNested,
  IsDateString, Min, MaxLength, ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── SUPPLIERS ─────────────────────────────────────────────────

export class SuppliersQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() propertyId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class CreateSupplierDto {
  @ApiPropertyOptional() @IsOptional() @IsString() propertyId?: string;
  @ApiProperty() @IsString() @MaxLength(150) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankAccount?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) paymentTerms?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) creditLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) rating?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  // Not persisted (Supplier has no category column) — accepted so the
  // create form's category picker doesn't 400; stored nowhere yet.
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
}

export class UpdateSupplierDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankAccount?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) paymentTerms?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) creditLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) rating?: number;
  @ApiPropertyOptional() @IsOptional() notes?: string;
  @ApiPropertyOptional() @IsOptional() isActive?: boolean;
}

// ─── PURCHASE REQUESTS ─────────────────────────────────────────

export enum ProcurementStatusEnum {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ORDERED = 'ORDERED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export class PurchaseRequestsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() propertyId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(ProcurementStatusEnum) status?: ProcurementStatusEnum;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class PurchaseRequestItemInputDto {
  @ApiProperty() @IsString() itemName: string;
  @ApiProperty() @IsNumber() @Min(0.001) quantity: number;
  @ApiProperty() @IsString() unit: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) estimatedCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreatePurchaseRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() propertyId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() urgency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  // Not persisted (PurchaseRequest has no department column) — folded
  // into notes by the service so the information isn't silently lost.
  @ApiPropertyOptional() @IsOptional() @IsString() department?: string;
  @ApiPropertyOptional({ type: [PurchaseRequestItemInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseRequestItemInputDto)
  items?: PurchaseRequestItemInputDto[];
}

export class ApprovePurchaseRequestDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] }) @IsEnum(['APPROVED', 'REJECTED']) action: 'APPROVED' | 'REJECTED';
}

// ─── PURCHASE ORDERS ───────────────────────────────────────────

export class PurchaseOrdersQueryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(ProcurementStatusEnum) status?: ProcurementStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierId?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class POLineItemInputDto {
  @ApiPropertyOptional() @IsOptional() @IsString() inventoryItemId?: string;
  @ApiProperty() @IsString() description: string;
  @ApiProperty() @IsNumber() @Min(0.001) quantity: number;
  @ApiProperty() @IsNumber() @Min(0) unitPrice: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxRate?: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiProperty() @IsString() supplierId: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedDate?: string;
  @ApiProperty() @IsNumber() @Min(0) subtotal: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) shippingCost?: number;
  @ApiProperty() @IsNumber() @Min(0) totalAmount: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ type: [POLineItemInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => POLineItemInputDto)
  lineItems?: POLineItemInputDto[];
}

export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsEnum(ProcurementStatusEnum) status?: ProcurementStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() receivedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ─── GOODS RECEIPTS ────────────────────────────────────────────

export class GoodsReceiptItemInputDto {
  @ApiPropertyOptional() @IsOptional() @IsString() poLineItemId?: string;
  @ApiProperty() @IsString() description: string;
  @ApiProperty() @IsNumber() @Min(0) quantityOrdered: number;
  @ApiProperty() @IsNumber() @Min(0) quantityReceived: number;
  @ApiProperty() @IsNumber() @Min(0) unitCost: number;
  @ApiPropertyOptional() @IsOptional() @IsString() batchNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreateGoodsReceiptDto {
  @ApiProperty() @IsString() purchaseOrderId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ type: [GoodsReceiptItemInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GoodsReceiptItemInputDto)
  items?: GoodsReceiptItemInputDto[];
}

// ─── SUPPLIER BILLS ────────────────────────────────────────────

export enum BillStatusEnum {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum BillPaymentMethodEnum {
  CASH = 'CASH',
  VISA = 'VISA',
  MASTERCARD = 'MASTERCARD',
  PAYPAL = 'PAYPAL',
  STRIPE = 'STRIPE',
  ORANGE_MONEY = 'ORANGE_MONEY',
  MTN_MOBILE_MONEY = 'MTN_MOBILE_MONEY',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHECK = 'CHECK',
  LOYALTY_POINTS = 'LOYALTY_POINTS',
}

export class BillsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() propertyId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(BillStatusEnum) status?: BillStatusEnum;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class BillLineItemInputDto {
  @ApiPropertyOptional() @IsOptional() @IsString() accountId?: string;
  @ApiProperty() @IsString() description: string;
  @ApiProperty() @IsNumber() @Min(0.001) quantity: number;
  @ApiProperty() @IsNumber() @Min(0) unitPrice: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxRate?: number;
}

export class CreateBillDto {
  @ApiPropertyOptional() @IsOptional() @IsString() propertyId?: string;
  @ApiProperty() @IsString() supplierId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseOrderId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierReference?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() billDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ type: [BillLineItemInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillLineItemInputDto)
  lineItems?: BillLineItemInputDto[];
}

export class MarkBillPaidDto {
  @ApiProperty() @IsNumber() @Min(0.01) amount: number;
  @ApiPropertyOptional() @IsOptional() @IsEnum(BillPaymentMethodEnum) method?: BillPaymentMethodEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
}
