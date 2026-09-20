import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum, IsPositive, Min, Max, MaxLength } from 'class-validator';

export enum PaymentMethodEnum {
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

export class PostChargeDto {
  @ApiProperty() @IsString() @MaxLength(20) chargeType: string;
  @ApiProperty() @IsString() @MaxLength(255) description: string;
  @ApiProperty() @IsNumber() @IsPositive() amount: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @IsPositive() quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) taxRate?: number;
}

export class CollectPaymentDto {
  @ApiProperty() @IsNumber() @IsPositive() amount: number;
  @ApiProperty({ enum: PaymentMethodEnum }) @IsEnum(PaymentMethodEnum) method: PaymentMethodEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export enum DiscountTypeEnum {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export class ApplyDiscountDto {
  @ApiProperty({ enum: DiscountTypeEnum }) @IsEnum(DiscountTypeEnum) discountType: DiscountTypeEnum;
  @ApiProperty() @IsNumber() @IsPositive() value: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) reason?: string;
}
