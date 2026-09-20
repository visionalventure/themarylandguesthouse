import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum DisciplinaryCaseStatusEnum {
  REPORTED = 'REPORTED', UNDER_REVIEW = 'UNDER_REVIEW', INVESTIGATING = 'INVESTIGATING',
  EMPLOYEE_NOTIFIED = 'EMPLOYEE_NOTIFIED', HEARING_SCHEDULED = 'HEARING_SCHEDULED',
  DECISION_PENDING = 'DECISION_PENDING', APPROVED = 'APPROVED', REJECTED = 'REJECTED',
  APPEALED = 'APPEALED', CLOSED = 'CLOSED',
}

export enum DisciplinaryActionTypeEnum {
  VERBAL_WARNING = 'VERBAL_WARNING', WRITTEN_WARNING = 'WRITTEN_WARNING',
  FINAL_WRITTEN_WARNING = 'FINAL_WRITTEN_WARNING', FINANCIAL_RECOVERY = 'FINANCIAL_RECOVERY',
  SUSPENSION_WITH_PAY = 'SUSPENSION_WITH_PAY', SUSPENSION_WITHOUT_PAY = 'SUSPENSION_WITHOUT_PAY',
  DEMOTION = 'DEMOTION', LOSS_OF_PRIVILEGE = 'LOSS_OF_PRIVILEGE', PIP = 'PIP',
  TRANSFER = 'TRANSFER', TERMINATION_RECOMMENDATION = 'TERMINATION_RECOMMENDATION',
}

export class DisciplinaryQueryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() employeeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(DisciplinaryCaseStatusEnum) status?: DisciplinaryCaseStatusEnum;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class CreateDisciplinaryCaseDto {
  @ApiProperty() @IsString() employeeId: string;
  @ApiProperty() @IsString() propertyId: string;
  @ApiProperty() @IsDateString() incidentDate: string;
  @ApiProperty() @IsString() category: string;
  @ApiProperty() @IsString() description: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) evidence?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() witnesses?: string;
}

export class UpdateDisciplinaryCaseDto {
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) evidence?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() witnesses?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() investigationNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(DisciplinaryCaseStatusEnum) status?: DisciplinaryCaseStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsDateString() decisionDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() decisionMakerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() effectiveDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() appealDeadline?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() finalOutcome?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() closedAt?: string;
}

export class AddDisciplinaryActionDto {
  @ApiProperty({ enum: DisciplinaryActionTypeEnum }) @IsEnum(DisciplinaryActionTypeEnum) actionType: DisciplinaryActionTypeEnum;
  @ApiProperty() @IsDateString() effectiveDate: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

// ─── SUSPENSIONS ─────────────────────────────────────────────

export enum SuspensionTypeEnum {
  WITH_PAY = 'WITH_PAY', WITHOUT_PAY = 'WITHOUT_PAY', INVESTIGATIVE = 'INVESTIGATIVE',
  ADMIN_LEAVE = 'ADMIN_LEAVE', TEMP_DUTY_REMOVAL = 'TEMP_DUTY_REMOVAL',
}

export class SuspensionsQueryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() employeeId?: string;
}

export class CreateSuspensionDto {
  @ApiProperty() @IsString() employeeId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() disciplinaryCaseId?: string;
  @ApiProperty({ enum: SuspensionTypeEnum }) @IsEnum(SuspensionTypeEnum) suspensionType: SuspensionTypeEnum;
  @ApiProperty() @IsDateString() startDate: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPaid?: boolean;
  @ApiProperty() @IsString() reason: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ReturnFromSuspensionDto {
  @ApiProperty() @IsDateString() returnDate: string;
}

// ─── GRIEVANCES ──────────────────────────────────────────────

export enum GrievanceTypeEnum {
  HARASSMENT = 'HARASSMENT', SALARY_DISPUTE = 'SALARY_DISPUTE', SUPERVISOR_COMPLAINT = 'SUPERVISOR_COMPLAINT',
  UNSAFE_CONDITIONS = 'UNSAFE_CONDITIONS', DISCRIMINATION = 'DISCRIMINATION', UNFAIR_TREATMENT = 'UNFAIR_TREATMENT',
  WORKLOAD = 'WORKLOAD', SHIFT_ROSTER = 'SHIFT_ROSTER', OTHER = 'OTHER',
}

export enum GrievanceStatusEnum {
  SUBMITTED = 'SUBMITTED', UNDER_REVIEW = 'UNDER_REVIEW', INVESTIGATION = 'INVESTIGATION',
  MEDIATION = 'MEDIATION', RESOLVED = 'RESOLVED', ESCALATED = 'ESCALATED', CLOSED = 'CLOSED',
}

export class GrievancesQueryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() employeeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(GrievanceStatusEnum) status?: GrievanceStatusEnum;
}

export class CreateGrievanceDto {
  @ApiProperty() @IsString() employeeId: string;
  @ApiProperty() @IsString() propertyId: string;
  @ApiProperty({ enum: GrievanceTypeEnum }) @IsEnum(GrievanceTypeEnum) grievanceType: GrievanceTypeEnum;
  @ApiProperty() @IsString() description: string;
}

export class UpdateGrievanceDto {
  @ApiPropertyOptional() @IsOptional() @IsEnum(GrievanceStatusEnum) status?: GrievanceStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedToId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() resolutionNotes?: string;
}
