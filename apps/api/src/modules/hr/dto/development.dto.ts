import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt, IsNumber, IsBoolean, IsArray, IsDateString, Min, Max } from 'class-validator';

export enum ReviewTypeEnum { PROBATION = 'PROBATION', MONTHLY = 'MONTHLY', QUARTERLY = 'QUARTERLY', ANNUAL = 'ANNUAL' }
export enum ReviewStatusEnum { DRAFT = 'DRAFT', SUBMITTED = 'SUBMITTED', APPROVED = 'APPROVED' }

export class PerformanceQueryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() employeeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(ReviewStatusEnum) status?: ReviewStatusEnum;
}

export class CreatePerformanceReviewDto {
  @ApiProperty() @IsString() employeeId: string;
  @ApiProperty() @IsString() reviewPeriod: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(ReviewTypeEnum) reviewType?: ReviewTypeEnum;
  @ApiProperty() @IsInt() @Min(1) @Max(5) overallRating: number;
  @ApiPropertyOptional() @IsOptional() feedback?: string;
  @ApiPropertyOptional() @IsOptional() improvements?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() promotionRecommended?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() incrementRecommended?: number;
}

export class UpdatePerformanceReviewDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(5) overallRating?: number;
  @ApiPropertyOptional() @IsOptional() feedback?: string;
  @ApiPropertyOptional() @IsOptional() improvements?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() promotionRecommended?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() incrementRecommended?: number;
  @ApiPropertyOptional() @IsOptional() @IsEnum(ReviewStatusEnum) status?: ReviewStatusEnum;
}

// ─── PROBATION ────────────────────────────────────────────────

export enum ProbationOutcomeEnum { CONFIRMED = 'CONFIRMED', EXTENDED = 'EXTENDED', TERMINATED = 'TERMINATED', PENDING = 'PENDING' }

export class ProbationQueryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() employeeId?: string;
}

export class CreateProbationReviewDto {
  @ApiProperty() @IsString() employeeId: string;
  @ApiProperty() @IsDateString() scheduledDate: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supervisorRecommendation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateProbationReviewDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() conductedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(ProbationOutcomeEnum) outcome?: ProbationOutcomeEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supervisorRecommendation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hrRecommendation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() finalDecision?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) extensionDays?: number;
}

// ─── TRAINING ────────────────────────────────────────────────

export class CreateTrainingProgramDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsString() category: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) requiredFor?: string[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) durationHours?: number;
}

export class TrainingAttendancesQueryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() employeeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() programId?: string;
}

export class RecordTrainingAttendanceDto {
  @ApiProperty() @IsString() programId: string;
  @ApiProperty() @IsString() employeeId: string;
  @ApiProperty() @IsDateString() scheduledAt: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CompleteTrainingDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) score?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() passed?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() certUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
