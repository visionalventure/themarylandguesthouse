import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsEnum, IsInt, IsBoolean, Min, Max, MaxLength } from 'class-validator';

export enum PropertyTypeEnum {
  GUESTHOUSE = 'GUESTHOUSE',
  HOTEL = 'HOTEL',
  LODGE = 'LODGE',
  RESORT = 'RESORT',
  APARTMENT = 'APARTMENT',
}

export class CreatePropertyDto {
  @ApiProperty() @IsString() @MaxLength(150) name: string;
  @ApiProperty() @IsString() @MaxLength(20) code: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(PropertyTypeEnum) type?: PropertyTypeEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(5) starRating?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() checkInTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() checkOutTime?: string;
}

export class UpdatePropertyDto extends PartialType(CreatePropertyDto) {
  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() coverImageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireIdentification?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireAddress?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requirePhone?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowAnonymousWalkIn?: boolean;
}
