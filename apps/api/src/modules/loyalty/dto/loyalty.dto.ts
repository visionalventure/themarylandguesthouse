import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsEnum, IsBoolean, IsNumber, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export enum LoyaltyTierEnum {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
  VIP = 'VIP',
}

export class MembersQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsEnum(LoyaltyTierEnum) tier?: LoyaltyTierEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class EarnPointsDto {
  @ApiProperty() @IsString() guestId: string;
  @ApiProperty() @IsInt() points: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceType?: string;
}

export class RedeemPointsDto {
  @ApiProperty() @IsString() guestId: string;
  @ApiProperty() @IsInt() points: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) reward?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceId?: string;
}

export class CreateLoyaltyRuleDto {
  @ApiProperty() @IsString() @MaxLength(100) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsString() type: string;
  @ApiProperty() @IsInt() pointsValue: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minSpend?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) multiplier?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateLoyaltyRuleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() pointsValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minSpend?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) multiplier?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
