import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsInt, IsBoolean, IsDateString, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export enum AttendanceStatusEnum {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  HALF_DAY = 'HALF_DAY',
  ON_LEAVE = 'ON_LEAVE',
}

export enum AttendanceAnomalyTypeEnum {
  REPEATED_LATENESS = 'REPEATED_LATENESS',
  NO_CLOCK_OUT = 'NO_CLOCK_OUT',
  EARLY_DEPARTURE = 'EARLY_DEPARTURE',
  UNAUTHORIZED_ABSENCE = 'UNAUTHORIZED_ABSENCE',
  EXCESSIVE_OVERTIME = 'EXCESSIVE_OVERTIME',
  MISSED_SHIFT = 'MISSED_SHIFT',
  SUSPICIOUS_EDIT = 'SUSPICIOUS_EDIT',
  ROSTER_CONFLICT = 'ROSTER_CONFLICT',
  HALF_DAY_PATTERN = 'HALF_DAY_PATTERN',
}

export enum AnomalySeverityEnum { LOW = 'LOW', MEDIUM = 'MEDIUM', HIGH = 'HIGH' }
export enum AnomalyStatusEnum { OPEN = 'OPEN', REVIEWED = 'REVIEWED', ESCALATED = 'ESCALATED', DISMISSED = 'DISMISSED', LINKED_TO_CASE = 'LINKED_TO_CASE' }

export class RecordAttendanceDto {
  @ApiProperty() @IsString() employeeId: string;
  @ApiProperty() @IsDateString() date: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() clockIn?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() clockOut?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) hoursWorked?: number;
  @ApiPropertyOptional() @IsOptional() @IsEnum(AttendanceStatusEnum) status?: AttendanceStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class AttendanceReportQueryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiProperty() @IsDateString() startDate: string;
  @ApiProperty() @IsDateString() endDate: string;
}

export class MyAttendanceQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class EditAttendanceDto {
  @ApiProperty() @IsString() @MaxLength(500) reason: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() clockIn?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() clockOut?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(AttendanceStatusEnum) status?: AttendanceStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class AnomaliesQueryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(AnomalyStatusEnum) status?: AnomalyStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() employeeId?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class CreateAnomalyDto {
  @ApiProperty() @IsString() employeeId: string;
  @ApiProperty({ enum: AttendanceAnomalyTypeEnum }) @IsEnum(AttendanceAnomalyTypeEnum) anomalyType: AttendanceAnomalyTypeEnum;
  @ApiProperty() @IsDateString() date: string;
  @ApiProperty() @IsString() description: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(AnomalySeverityEnum) severity?: AnomalySeverityEnum;
}

export class UpdateAnomalyDto {
  @ApiProperty({ enum: AnomalyStatusEnum }) @IsEnum(AnomalyStatusEnum) status: AnomalyStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() reviewNotes?: string;
}

// ─── LEAVE ────────────────────────────────────────────────────

export enum LeaveTypeEnum {
  ANNUAL = 'ANNUAL', SICK = 'SICK', MATERNITY = 'MATERNITY', PATERNITY = 'PATERNITY',
  UNPAID = 'UNPAID', COMPASSIONATE = 'COMPASSIONATE', STUDY = 'STUDY', CASUAL = 'CASUAL',
  EMERGENCY = 'EMERGENCY', SUSPENSION = 'SUSPENSION',
}

export enum LeaveStatusEnum { PENDING = 'PENDING', APPROVED = 'APPROVED', REJECTED = 'REJECTED', CANCELLED = 'CANCELLED' }

export class LeaveRequestsQueryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(LeaveStatusEnum) status?: LeaveStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() employeeId?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class CreateLeaveRequestDto {
  @ApiProperty() @IsString() employeeId: string;
  @ApiProperty({ enum: LeaveTypeEnum }) @IsEnum(LeaveTypeEnum) leaveType: LeaveTypeEnum;
  @ApiProperty() @IsDateString() startDate: string;
  @ApiProperty() @IsDateString() endDate: string;
  @ApiProperty() @IsInt() @Min(1) totalDays: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class RejectLeaveDto {
  @ApiProperty() @IsString() @MaxLength(500) reason: string;
}

export class UpsertLeaveBalanceDto {
  @ApiProperty() @IsString() employeeId: string;
  @ApiProperty() @IsInt() year: number;
  @ApiProperty({ enum: LeaveTypeEnum }) @IsEnum(LeaveTypeEnum) leaveType: LeaveTypeEnum;
  @ApiProperty() @IsInt() @Min(0) entitled: number;
}

// ─── SHIFT / ROSTER ────────────────────────────────────────────

export class RosterQueryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() employeeId?: string;
}

export class UpsertShiftDto {
  @ApiProperty() @IsString() employeeId: string;
  @ApiProperty() @IsString() propertyId: string;
  @ApiProperty() @IsDateString() shiftDate: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shiftType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() startTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() endTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) breakMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isConfirmed?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreateShiftTypeDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiProperty() @IsString() @MaxLength(50) name: string;
  @ApiProperty() @IsString() @MaxLength(50) label: string;
  @ApiProperty() @IsString() startTime: string;
  @ApiProperty() @IsString() endTime: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) breakMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
}

export class UpdateShiftTypeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) label?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() startTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() endTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) breakMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
