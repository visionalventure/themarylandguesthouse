import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsInt, IsBoolean, IsArray, IsDateString, Min, MaxLength } from 'class-validator';

// ─── STAFF LOANS ─────────────────────────────────────────────

export enum StaffLoanStatusEnum { PENDING = 'PENDING', APPROVED = 'APPROVED', ACTIVE = 'ACTIVE', SETTLED = 'SETTLED', REJECTED = 'REJECTED', CANCELLED = 'CANCELLED' }

export class StaffLoansQueryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() employeeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(StaffLoanStatusEnum) status?: StaffLoanStatusEnum;
}

export class CreateStaffLoanDto {
  @ApiProperty() @IsString() employeeId: string;
  @ApiProperty() @IsString() loanType: string;
  @ApiProperty() @IsNumber() @Min(0) amount: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) interestRate?: number;
  @ApiProperty() @IsNumber() @Min(0) installmentAmount: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) installments?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class RecordRepaymentDto {
  @ApiProperty() @IsNumber() @Min(0) amount: number;
  @ApiPropertyOptional() @IsOptional() @IsString() payrollPeriod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ─── ASSET ISSUANCE ──────────────────────────────────────────

export class AssetIssuesQueryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() employeeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}

export class IssueAssetDto {
  @ApiProperty() @IsString() employeeId: string;
  @ApiProperty() @IsString() assetType: string;
  @ApiProperty() @IsString() description: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNumber?: string;
  @ApiProperty() @IsDateString() issuedDate: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedReturn?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() conditionOnIssue?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) replacementCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ReturnAssetDto {
  @ApiProperty() @IsString() conditionOnReturn: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ─── CASH HANDLING INCIDENTS ─────────────────────────────────

export class CashIncidentsQueryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() employeeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}

export class CreateCashIncidentDto {
  @ApiProperty() @IsString() employeeId: string;
  @ApiProperty() @IsString() propertyId: string;
  @ApiProperty() @IsString() incidentType: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() amount?: number;
  @ApiProperty() @IsString() description: string;
  @ApiProperty() @IsDateString() incidentDate: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateCashIncidentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() disciplinaryCaseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() recoveryDeductionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ─── EMPLOYEE DOCUMENTS ───────────────────────────────────────

export class UploadEmployeeDocumentDto {
  @ApiProperty() @IsString() category: string;
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() fileUrl: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ─── BENEFITS ─────────────────────────────────────────────────

export class CreateBenefitDto {
  @ApiProperty() @IsString() benefitType: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsNumber() @Min(0) amount: number;
  @ApiPropertyOptional() @IsOptional() @IsString() frequency?: string;
  @ApiProperty() @IsDateString() startDate: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
}

export class UpdateBenefitDto {
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) amount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() frequency?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
}

// ─── POLICY DOCUMENTS ─────────────────────────────────────────

export class CreatePolicyDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiProperty() @IsString() @MaxLength(150) title: string;
  @ApiProperty() @IsString() category: string;
  @ApiPropertyOptional() @IsOptional() @IsString() version?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fileUrl?: string;
  @ApiProperty() @IsDateString() effectiveDate: string;
}

export class AcknowledgePolicyDto {
  @ApiProperty() @IsString() employeeId: string;
}

// ─── EMPLOYEE INCIDENTS (HEALTH & SAFETY) ────────────────────

export class EmployeeIncidentsQueryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() employeeId?: string;
}

export class CreateEmployeeIncidentDto {
  @ApiProperty() @IsString() employeeId: string;
  @ApiProperty() @IsString() propertyId: string;
  @ApiProperty() @IsString() incidentType: string;
  @ApiProperty() @IsString() description: string;
  @ApiProperty() @IsDateString() incidentDate: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() witnesses?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) evidenceUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() followUpActions?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() returnToWorkDate?: string;
}

export class UpdateEmployeeIncidentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() witnesses?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) evidenceUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() followUpActions?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() returnToWorkDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}

// ─── HR APPROVAL REQUESTS ─────────────────────────────────────

export class ApprovalsQueryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}

export class CreateApprovalDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiProperty() @IsString() requestType: string;
  @ApiProperty() @IsString() referenceId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedToId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export enum ApprovalDecisionEnum { APPROVED = 'APPROVED', REJECTED = 'REJECTED' }

export class DecideApprovalDto {
  @ApiProperty({ enum: ApprovalDecisionEnum }) @IsEnum(ApprovalDecisionEnum) status: ApprovalDecisionEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
