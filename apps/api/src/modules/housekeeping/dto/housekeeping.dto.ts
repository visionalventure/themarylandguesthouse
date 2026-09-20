import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString, MaxLength } from 'class-validator';

export enum TaskStatusEnum {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class HousekeepingQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() propertyId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(TaskStatusEnum) status?: TaskStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() roomId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedToId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() date?: string;
}

export class CreateHousekeepingTaskDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiProperty() @IsString() roomId: string;
  @ApiProperty() @IsString() @MaxLength(30) taskType: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedToId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateHousekeepingTaskDto extends PartialType(CreateHousekeepingTaskDto) {
  @ApiPropertyOptional() @IsOptional() @IsEnum(TaskStatusEnum) status?: TaskStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() inspectionNotes?: string;
}
