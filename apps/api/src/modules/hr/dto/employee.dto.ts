import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsInt, IsDateString, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export enum EmployeeStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  TERMINATED = 'TERMINATED',
  SUSPENDED = 'SUSPENDED',
  RESIGNED = 'RESIGNED',
  RETIRED = 'RETIRED',
  PROBATION = 'PROBATION',
}

export enum EmploymentTypeEnum {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  CASUAL = 'CASUAL',
  TEMPORARY = 'TEMPORARY',
  INTERN = 'INTERN',
  CONSULTANT = 'CONSULTANT',
}

export class EmployeesQueryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(EmployeeStatusEnum) status?: EmployeeStatusEnum;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class CreateEmployeeDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() userId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supervisorId?: string;
  @ApiProperty() @IsString() @MaxLength(100) firstName: string;
  @ApiProperty() @IsString() @MaxLength(100) lastName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) preferredName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nationalId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateOfBirth?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gender?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nationality?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emergencyContact?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emergencyPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nextOfKin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nextOfKinPhone?: string;
  @ApiProperty() @IsString() @MaxLength(150) position: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(EmploymentTypeEnum) employmentType?: EmploymentTypeEnum;
  @ApiProperty() @IsDateString() startDate: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() contractEndDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() probationStartDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() probationEndDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(EmployeeStatusEnum) status?: EmployeeStatusEnum;
  @ApiProperty() @IsNumber() @Min(0) baseSalary: number;
  @ApiPropertyOptional() @IsOptional() @IsString() bankName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankAccount?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankBranch?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mobileMoney?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() avatarUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) preferredName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nationalId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateOfBirth?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gender?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nationality?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emergencyContact?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emergencyPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nextOfKin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nextOfKinPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) position?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(EmploymentTypeEnum) employmentType?: EmploymentTypeEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supervisorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) baseSalary?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() bankName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankAccount?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankBranch?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mobileMoney?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() contractEndDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() probationStartDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() probationEndDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(EmployeeStatusEnum) status?: EmployeeStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() avatarUrl?: string;
}
