import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsInt, IsDateString, Min, MaxLength,
} from 'class-validator';

export class UpsertMenuOfTheDayDto {
  @ApiProperty() @IsDateString() date: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class CreateMenuOfTheDayEntryDto {
  // Set => sourced from the permanent menu (name/description/price/allergens/
  // veg flags are pulled live from that MenuItem, any client-sent values for
  // those fields are ignored). Omitted => a freeform one-off special, which
  // requires name + price.
  @ApiPropertyOptional() @IsOptional() @IsString() menuItemId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) price?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) allergens?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isVegetarian?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isVegan?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class UpdateMenuOfTheDayEntryDto extends PartialType(CreateMenuOfTheDayEntryDto) {}
