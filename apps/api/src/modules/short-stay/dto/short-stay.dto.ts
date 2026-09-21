import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsInt, IsNumber, IsEnum, Min, MaxLength,
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
}

export class CreateShortStayDto {
  @ApiProperty() @IsString() roomId: string;
  @ApiPropertyOptional() @IsOptional() @Transform(emptyToUndefined) @IsString() @MaxLength(150) guestName?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(emptyToUndefined) @IsString() @MaxLength(30) guestPhone?: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) durationHours: number;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) hourlyRate: number;
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
