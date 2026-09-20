import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsNumber, IsBoolean, IsEnum, IsArray, IsInt,
  ValidateNested, Min, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum OrderStatusEnum {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  SERVED = 'SERVED',
  CANCELLED = 'CANCELLED',
  VOID = 'VOID',
}

export class CreateMenuItemDto {
  @ApiProperty() @IsString() @MaxLength(150) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsNumber() @Min(0) price: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) costPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAvailable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) preparationTime?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) allergens?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isVegetarian?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isVegan?: boolean;
}

export class UpdateMenuItemDto extends PartialType(CreateMenuItemDto) {}

export class OrderItemInputDto {
  @ApiProperty() @IsString() menuItemId: string;
  @ApiProperty() @IsInt() @Min(1) quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreateOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() tableId?: string;
  @ApiProperty({ type: [OrderItemInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) guestName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) roomNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) orderType?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatusEnum }) @IsEnum(OrderStatusEnum) status: OrderStatusEnum;
}

export class MoveTableDto {
  @ApiProperty() @IsString() tableId: string;
}

export class OrdersQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsEnum(OrderStatusEnum) status?: OrderStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() tableId?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class RevenueQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() endDate?: string;
}
