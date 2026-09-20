import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';

export class ReportQueryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
}

export enum ReportExportTypeEnum {
  OCCUPANCY = 'occupancy',
  REVENUE = 'revenue',
  GUESTS = 'guests',
}

export class ExportReportQueryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiPropertyOptional({ enum: ReportExportTypeEnum }) @IsOptional() @IsEnum(ReportExportTypeEnum) type?: ReportExportTypeEnum;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
}
