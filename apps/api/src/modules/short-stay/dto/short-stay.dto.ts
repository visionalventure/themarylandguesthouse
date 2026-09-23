import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsInt, IsNumber, IsEnum, IsDateString, IsIn, IsBoolean, IsArray, Min, MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

const emptyToUndefined = ({ value }: { value: unknown }) => (value === '' ? undefined : value);

export enum ShortStayDepositMethodEnum {
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

export enum ShortStayStatusEnum {
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELLED = 'CANCELLED',
  UPGRADED = 'UPGRADED',
}

export class CreateShortStayDto {
  @ApiProperty() @IsString() roomId: string;
  @ApiPropertyOptional({ description: 'Backdate the check-in time for late entries; defaults to now' })
  @IsOptional() @Transform(emptyToUndefined) @IsDateString() checkIn?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(emptyToUndefined) @IsString() guestId?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(emptyToUndefined) @IsString() @MaxLength(150) guestName?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(emptyToUndefined) @IsString() @MaxLength(30) guestPhone?: string;
  @ApiProperty({ description: 'Short stays are capped at 3 hours', enum: [1, 2, 3] }) @Type(() => Number) @IsIn([1, 2, 3]) durationHours: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) depositAmount?: number;
  @ApiPropertyOptional({ enum: ShortStayDepositMethodEnum }) @IsOptional() @IsEnum(ShortStayDepositMethodEnum) depositMethod?: ShortStayDepositMethodEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ShortStayQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() propertyId?: string;
  @ApiPropertyOptional({ enum: ShortStayStatusEnum }) @IsOptional() @IsEnum(ShortStayStatusEnum) status?: ShortStayStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class ExtendShortStayDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) additionalHours: number;
}

export class CheckOutShortStayDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) paymentAmount?: number;
  @ApiPropertyOptional({ enum: ShortStayDepositMethodEnum }) @IsOptional() @IsEnum(ShortStayDepositMethodEnum) paymentMethod?: ShortStayDepositMethodEnum;
}

export class ConvertShortStayDto {
  @ApiProperty() @IsString() reservationId: string;
}

export class CreateShortStayOfferDto {
  @ApiProperty() @IsString() @MaxLength(100) name: string;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) hourlyRate: number;
  @ApiPropertyOptional({ type: [String], description: 'Room IDs this offer is assigned to' })
  @IsOptional() @IsArray() @IsString({ each: true }) roomIds?: string[];
}

export class UpdateShortStayOfferDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) name?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) hourlyRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional({ type: [String], description: 'Room IDs this offer is assigned to (replaces the current set)' })
  @IsOptional() @IsArray() @IsString({ each: true }) roomIds?: string[];
}
