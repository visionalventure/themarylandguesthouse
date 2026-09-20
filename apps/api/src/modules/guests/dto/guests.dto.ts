import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsEmail, IsBoolean, IsEnum, IsInt, IsDateString,
  MaxLength, Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

const emptyToUndefined = ({ value }: { value: unknown }) => (value === '' ? undefined : value);

export enum GuestPrivacyTypeEnum {
  STANDARD = 'STANDARD',
  PRIVATE = 'PRIVATE',
  VIP = 'VIP',
  CONFIDENTIAL = 'CONFIDENTIAL',
}

export class CreateGuestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() propertyId?: string;
  @ApiProperty() @IsString() @MaxLength(100) firstName: string;
  @ApiProperty() @IsString() @MaxLength(100) lastName: string;
  @ApiPropertyOptional() @IsOptional() @Transform(emptyToUndefined) @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) nationalId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) passportNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() passportExpiry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) nationality?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateOfBirth?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) gender?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) company?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) jobTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dietaryPrefs?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() roomPreferences?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(GuestPrivacyTypeEnum) privacyType?: GuestPrivacyTypeEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) alias?: string;
}

export class UpdateGuestDto extends PartialType(CreateGuestDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() blacklisted?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() blacklistReason?: string;
}

export class GuestQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() propertyId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tenantId?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() blacklisted?: string;
}

export class RevealIdentityDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
