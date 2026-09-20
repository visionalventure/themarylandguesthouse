import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsBoolean,
  IsInt,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { UserRole, PropertyType } from '@prisma/client';

const emptyToUndefined = ({ value }: { value: unknown }) => (value === '' ? undefined : value);

export enum TaxRateTypeEnum {
  GST = 'GST',
  VAT = 'VAT',
  WITHHOLDING = 'WITHHOLDING',
  SALES = 'SALES',
  OTHER = 'OTHER',
}

export class UpdatePropertyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) code?: string;
  @ApiPropertyOptional({ enum: PropertyType }) @IsOptional() @IsEnum(PropertyType) type?: PropertyType;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(emptyToUndefined) @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() starRating?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() checkInTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() checkOutTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() coverImageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() invoiceTemplate?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireIdentification?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireAddress?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requirePhone?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowAnonymousWalkIn?: boolean;
}

export class InviteUserDto {
  @ApiProperty() @IsString() @MaxLength(100) firstName: string;
  @ApiProperty() @IsString() @MaxLength(100) lastName: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ enum: UserRole }) @IsEnum(UserRole) role: UserRole;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() departmentId?: string;
}

export class UpdateRoleDto {
  @ApiProperty({ enum: UserRole }) @IsEnum(UserRole) role: UserRole;
}

export class UpdateUserNameDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) lastName?: string;
}

export class UpdateUserEmailDto {
  @ApiProperty() @IsEmail() email: string;
}

export class CreateTaxRateDto {
  @ApiProperty() @IsString() @MaxLength(100) name: string;
  @ApiProperty() @IsString() @MaxLength(20) code: string;
  @ApiProperty() @IsInt() rate: number;
  @ApiProperty({ enum: TaxRateTypeEnum }) @IsEnum(TaxRateTypeEnum) type: TaxRateTypeEnum;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}

class BookingPolicyDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() holdDurationMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() defaultDepositPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() depositRequiredDaysOut?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() freeCancellationHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() cancellationRefundPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowOverbooking?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() overbookingPercent?: number;
}

class NightAuditPolicyDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoChargeEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() noShowGraceMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledTime?: string;
}

class AttendancePolicyDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() graceMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() halfDayThresholdHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() earlyDepartureTolerance?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() highSeverityThresholdMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() probationAlertDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() contractAlertDays?: number;
}

class AccountingPolicyDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() fiscalYearStartMonth?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() defaultInvoiceDueDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() invoicePrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() journalPrefix?: string;
}

class ProcurementPolicyDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() approvalThreshold?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() defaultPaymentTermsDays?: number;
}

class LoyaltyPolicyDto {
  @ApiPropertyOptional() @IsOptional() @IsObject() tierThresholds?: Record<string, number>;
  @ApiPropertyOptional() @IsOptional() @IsInt() defaultEarningRate?: number;
}

class NotificationsPolicyDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() emailOnNewReservation?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() emailOnCheckOut?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() emailOnInvoiceCreated?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() emailOnPaymentReceived?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() inAppOnNewReservation?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() inAppOnPaymentReceived?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() inAppOnMaintenanceAlert?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() inAppOnLowInventory?: boolean;
}

export class UpdatePolicyConfigDto {
  @ApiPropertyOptional({ type: BookingPolicyDto }) @IsOptional() @IsObject() booking?: BookingPolicyDto;
  @ApiPropertyOptional({ type: NightAuditPolicyDto }) @IsOptional() @IsObject() nightAudit?: NightAuditPolicyDto;
  @ApiPropertyOptional({ type: AttendancePolicyDto }) @IsOptional() @IsObject() attendance?: AttendancePolicyDto;
  @ApiPropertyOptional({ type: AccountingPolicyDto }) @IsOptional() @IsObject() accounting?: AccountingPolicyDto;
  @ApiPropertyOptional({ type: ProcurementPolicyDto }) @IsOptional() @IsObject() procurement?: ProcurementPolicyDto;
  @ApiPropertyOptional({ type: LoyaltyPolicyDto }) @IsOptional() @IsObject() loyalty?: LoyaltyPolicyDto;
  @ApiPropertyOptional({ type: NotificationsPolicyDto }) @IsOptional() @IsObject() notifications?: NotificationsPolicyDto;
}

export class UpdateEmailConfigDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) fromName?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(emptyToUndefined) @IsEmail() fromEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) replyTo?: string;
}

export class SendTestEmailDto {
  @ApiProperty() @IsEmail() to: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() avatarUrl?: string;
}

export class CreateDepartmentDto {
  @ApiProperty() @IsString() @MaxLength(100) name: string;
  @ApiProperty() @IsString() @MaxLength(20) code: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class AuditLogQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() entityType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() userId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() page?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() limit?: number;
}
