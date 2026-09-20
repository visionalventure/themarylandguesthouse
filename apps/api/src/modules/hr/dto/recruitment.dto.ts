import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsDateString, Min } from 'class-validator';

export enum JobOpeningStatusEnum { OPEN = 'OPEN', FILLED = 'FILLED', CANCELLED = 'CANCELLED', ON_HOLD = 'ON_HOLD' }
export enum CandidateStatusEnum {
  APPLIED = 'APPLIED', SHORTLISTED = 'SHORTLISTED', INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
  INTERVIEWED = 'INTERVIEWED', OFFER_EXTENDED = 'OFFER_EXTENDED', HIRED = 'HIRED',
  REJECTED = 'REJECTED', WITHDRAWN = 'WITHDRAWN',
}
export enum InterviewFormatEnum { IN_PERSON = 'IN_PERSON', PHONE = 'PHONE', VIDEO = 'VIDEO' }

export class JobOpeningsQueryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(JobOpeningStatusEnum) status?: JobOpeningStatusEnum;
}

export class CreateJobOpeningDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() requirements?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) salaryMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) salaryMax?: number;
  @ApiProperty() @IsDateString() openDate: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() closeDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hiringManagerId?: string;
}

export class UpdateJobOpeningDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() requirements?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) salaryMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) salaryMax?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() closeDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(JobOpeningStatusEnum) status?: JobOpeningStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() hiringManagerId?: string;
}

export class CreateCandidateDto {
  @ApiProperty() @IsString() firstName: string;
  @ApiProperty() @IsString() lastName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() resumeUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateCandidateStatusDto {
  @ApiProperty({ enum: CandidateStatusEnum }) @IsEnum(CandidateStatusEnum) status: CandidateStatusEnum;
}

export class ScheduleInterviewDto {
  @ApiProperty() @IsDateString() scheduledAt: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(InterviewFormatEnum) format?: InterviewFormatEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export { CreateEmployeeDto as ConvertToEmployeeDto } from './employee.dto';

// ─── ONBOARDING ──────────────────────────────────────────────

export class UpdateOnboardingDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() contractUploaded?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() idCaptured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() roleAssigned?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() payrollCreated?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() deptAssigned?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() uniformIssued?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() systemAccess?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() orientationDone?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() policyAcknowledged?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ─── OFFBOARDING ─────────────────────────────────────────────

export enum SeparationTypeEnum {
  RESIGNATION = 'RESIGNATION', TERMINATION = 'TERMINATION', END_OF_CONTRACT = 'END_OF_CONTRACT',
  RETIREMENT = 'RETIREMENT', DISMISSAL = 'DISMISSAL', ABSCONDED = 'ABSCONDED', REDUNDANCY = 'REDUNDANCY',
}

export class OffboardingQueryDto {
  @ApiProperty() @IsString() propertyId: string;
}

export class CreateOffboardingCaseDto {
  @ApiProperty() @IsString() employeeId: string;
  @ApiProperty({ enum: SeparationTypeEnum }) @IsEnum(SeparationTypeEnum) separationType: SeparationTypeEnum;
  @ApiPropertyOptional() @IsOptional() @IsDateString() noticeDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() lastWorkingDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateOffboardingCaseDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() noticeDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() lastWorkingDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() letterUploaded?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() finalPayProcessed?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() deductionsSettled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() handoverCompleted?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() assetsReturned?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() accessRevoked?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() exitInterviewDone?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() finalDocumentsIssued?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
