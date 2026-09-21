import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsEnum, IsInt, IsNumber, IsEmail, IsDateString,
  Min, MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

const emptyToUndefined = ({ value }: { value: unknown }) => (value === '' ? undefined : value);

export enum InquiryTypeEnum {
  EVENT_PARTY = 'EVENT_PARTY',
  LONG_STAY = 'LONG_STAY',
  ROOM_BOOKING = 'ROOM_BOOKING',
  OTHER = 'OTHER',
}

export enum InquiryStatusEnum {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  CONVERTED = 'CONVERTED',
  LOST = 'LOST',
}

export class CreateInquiryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiProperty() @IsString() @MaxLength(150) guestName: string;
  @ApiProperty() @IsString() @MaxLength(30) phone: string;
  @ApiPropertyOptional() @IsOptional() @Transform(emptyToUndefined) @IsEmail() email?: string;
  @ApiPropertyOptional({ enum: InquiryTypeEnum }) @IsOptional() @IsEnum(InquiryTypeEnum) type?: InquiryTypeEnum;
  @ApiPropertyOptional() @IsOptional() @Transform(emptyToUndefined) @IsDateString() inquiryDate?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(emptyToUndefined) @IsDateString() eventDate?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(emptyToUndefined) @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(emptyToUndefined) @IsDateString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) partySize?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) quotedPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) source?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateInquiryDto extends PartialType(CreateInquiryDto) {
  @ApiPropertyOptional({ enum: InquiryStatusEnum }) @IsOptional() @IsEnum(InquiryStatusEnum) status?: InquiryStatusEnum;
}

export class InquiryQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() propertyId?: string;
  @ApiPropertyOptional({ enum: InquiryStatusEnum }) @IsOptional() @IsEnum(InquiryStatusEnum) status?: InquiryStatusEnum;
  @ApiPropertyOptional({ enum: InquiryTypeEnum }) @IsOptional() @IsEnum(InquiryTypeEnum) type?: InquiryTypeEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class ConvertInquiryDto {
  @ApiProperty() @IsString() reservationId: string;
}
