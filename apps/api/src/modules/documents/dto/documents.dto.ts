import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt, IsArray, IsDateString, IsUrl, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum DocumentCategoryEnum {
  CONTRACT = 'CONTRACT',
  LICENSE = 'LICENSE',
  STAFF_FILE = 'STAFF_FILE',
  PROCUREMENT = 'PROCUREMENT',
  FINANCIAL = 'FINANCIAL',
  LEGAL = 'LEGAL',
  INSURANCE = 'INSURANCE',
  OTHER = 'OTHER',
}

export class DocumentQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class CreateDocumentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() propertyId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(DocumentCategoryEnum) category?: DocumentCategoryEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) customCategory?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl({ require_tld: false }) fileUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fileName?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() fileSize?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() mimeType?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiryDate?: string;
}

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {}

export class CreateDocumentCategoryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiProperty() @IsString() @MaxLength(50) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) color?: string;
}
