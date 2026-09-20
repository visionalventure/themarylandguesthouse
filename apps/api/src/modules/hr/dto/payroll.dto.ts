import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsInt, IsBoolean, IsDateString, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMethodEnum {
  CASH = 'CASH',
  VISA = 'VISA',
  MASTERCARD = 'MASTERCARD',
  PAYPAL = 'PAYPAL',
  STRIPE = 'STRIPE',
  ORANGE_MONEY = 'ORANGE_MONEY',
  MTN_MOBILE_MONEY = 'MTN_MOBILE_MONEY',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHECK = 'CHECK',
  LOYALTY_POINTS = 'LOYALTY_POINTS',
}

export enum PayrollStatusEnum { DRAFT = 'DRAFT', APPROVED = 'APPROVED', PAID = 'PAID' }

export class PayrollHistoryQueryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(PayrollStatusEnum) status?: PayrollStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() employeeId?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class RunPayrollDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiProperty() @IsDateString() periodStart: string;
  @ApiProperty() @IsDateString() periodEnd: string;
}

export class UpdatePayrollRecordDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) allowances?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) overtime?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) deductions?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) tax?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(PayrollStatusEnum) status?: PayrollStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsEnum(PaymentMethodEnum) paymentMethod?: PaymentMethodEnum;
  @ApiPropertyOptional() @IsOptional() @IsDateString() paidAt?: string;
}

export class PayrollSummaryQueryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiProperty() @IsString() period: string;
}

// ─── PAYROLL DEDUCTIONS ──────────────────────────────────────

export enum DeductionCategoryEnum {
  DAMAGE_RECOVERY = 'DAMAGE_RECOVERY',
  UNAUTHORIZED_ABSENCE = 'UNAUTHORIZED_ABSENCE',
  CASH_SHORTAGE = 'CASH_SHORTAGE',
  TILL_VARIANCE = 'TILL_VARIANCE',
  SALARY_ADVANCE = 'SALARY_ADVANCE',
  LOAN_RECOVERY = 'LOAN_RECOVERY',
  ASSET_LOSS = 'ASSET_LOSS',
  DISCIPLINARY_FINE = 'DISCIPLINARY_FINE',
  UNIFORM_RECOVERY = 'UNIFORM_RECOVERY',
  DEVICE_RECOVERY = 'DEVICE_RECOVERY',
  OTHER = 'OTHER',
}

export class PayrollDeductionsQueryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() employeeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}

export class CreatePayrollDeductionDto {
  @ApiProperty() @IsString() employeeId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() disciplinaryCaseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() staffLoanId?: string;
  @ApiProperty({ enum: DeductionCategoryEnum }) @IsEnum(DeductionCategoryEnum) category: DeductionCategoryEnum;
  @ApiProperty() @IsString() description: string;
  @ApiProperty() @IsNumber() @Min(0) amount: number;
  @ApiPropertyOptional() @IsOptional() @IsString() deductionType?: string;
  @ApiProperty() @IsString() @MaxLength(20) effectivePeriod: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRecurring?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) installmentTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
