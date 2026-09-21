import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsEnum, IsInt, IsNumber, IsBoolean, IsArray,
  IsDateString, Min, MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

const emptyToUndefined = ({ value }: { value: unknown }) => (value === '' ? undefined : value);

export enum RoomStatusEnum {
  AVAILABLE = 'AVAILABLE',
  VACANT_DIRTY = 'VACANT_DIRTY',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  CLEANING = 'CLEANING',
  MAINTENANCE = 'MAINTENANCE',
  OUT_OF_ORDER = 'OUT_OF_ORDER',
  BLOCKED = 'BLOCKED',
}

export enum RoomTypeEnum {
  SINGLE = 'SINGLE',
  DOUBLE = 'DOUBLE',
  TWIN = 'TWIN',
  TRIPLE = 'TRIPLE',
  SUITE = 'SUITE',
  EXECUTIVE_SUITE = 'EXECUTIVE_SUITE',
  PRESIDENTIAL_SUITE = 'PRESIDENTIAL_SUITE',
  FAMILY_ROOM = 'FAMILY_ROOM',
  CONFERENCE_ROOM = 'CONFERENCE_ROOM',
}

export class RoomsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() propertyId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(RoomStatusEnum) status?: RoomStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsEnum(RoomTypeEnum) type?: RoomTypeEnum;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() floor?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class AvailableRoomsQueryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiProperty() @IsDateString() checkIn: string;
  @ApiProperty() @IsDateString() checkOut: string;
}

export class CreateRoomCategoryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiProperty() @IsString() @MaxLength(100) name: string;
  @ApiProperty({ enum: RoomTypeEnum }) @IsEnum(RoomTypeEnum) type: RoomTypeEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsNumber() @Min(0) basePrice: number;
  @ApiProperty() @IsInt() @Min(1) maxOccupancy: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) bedCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) amenities?: string[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) hourlyRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isShortStayEligible?: boolean;
}

export class UpdateRoomCategoryDto extends PartialType(CreateRoomCategoryDto) {}

export class CreateRoomDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiProperty() @IsString() categoryId: string;
  @ApiProperty() @IsString() @MaxLength(20) roomNumber: string;
  @ApiProperty() @IsInt() floor: number;
  @ApiPropertyOptional() @IsOptional() @IsEnum(RoomStatusEnum) status?: RoomStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) amenities?: string[];
}

export class UpdateRoomDto {
  @ApiPropertyOptional() @IsOptional() @IsString() propertyId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) roomNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() floor?: number;
  @ApiPropertyOptional() @IsOptional() @IsEnum(RoomStatusEnum) status?: RoomStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() lastCleaned?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() lastInspected?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) amenities?: string[];
}

export class UpdateRoomStatusDto {
  @ApiProperty({ enum: RoomStatusEnum }) @IsEnum(RoomStatusEnum) status: RoomStatusEnum;
}

export class CreateRoomPricingDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) name?: string;
  @ApiProperty() @IsNumber() pricePerNight: number;
  @ApiPropertyOptional() @IsOptional() @Transform(emptyToUndefined) @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(emptyToUndefined) @IsDateString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) minNights?: number;
}

export class UpdateRoomPricingDto extends PartialType(CreateRoomPricingDto) {}
