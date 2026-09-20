import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsInt, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export enum MaintenanceStatusEnum {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ON_HOLD = 'ON_HOLD',
}

export enum MaintenancePriorityEnum {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AssetStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  UNDER_MAINTENANCE = 'UNDER_MAINTENANCE',
  DISPOSED = 'DISPOSED',
  LOST = 'LOST',
}

export class WorkOrderQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() propertyId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(MaintenanceStatusEnum) status?: MaintenanceStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsEnum(MaintenancePriorityEnum) priority?: MaintenancePriorityEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() roomId?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class CreateWorkOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() tenantId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() propertyId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assetId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() roomId?: string;
  @ApiProperty() @IsString() @MaxLength(255) title: string;
  @ApiProperty() @IsString() description: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(MaintenancePriorityEnum) priority?: MaintenancePriorityEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedToId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) estimatedHours?: number;
}

export class UpdateWorkOrderDto extends PartialType(CreateWorkOrderDto) {
  @ApiPropertyOptional() @IsOptional() @IsEnum(MaintenanceStatusEnum) status?: MaintenanceStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) estimatedHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) actualHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) laborCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) partsCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() resolution?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class AssetQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() propertyId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(AssetStatusEnum) status?: AssetStatusEnum;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class CreateAssetDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiProperty() @IsString() @MaxLength(150) name: string;
  @ApiProperty() @IsString() @MaxLength(50) category: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() purchaseDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) purchasePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) currentValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() warrantyExpiry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
}

export class UpdateAssetDto extends PartialType(CreateAssetDto) {
  @ApiPropertyOptional() @IsOptional() @IsEnum(AssetStatusEnum) status?: AssetStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsDateString() lastServiced?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() nextServiceDate?: string;
}
