-- CreateEnum
CREATE TYPE "DisciplinaryActionType" AS ENUM ('VERBAL_WARNING', 'WRITTEN_WARNING', 'FINAL_WRITTEN_WARNING', 'FINANCIAL_RECOVERY', 'SUSPENSION_WITH_PAY', 'SUSPENSION_WITHOUT_PAY', 'DEMOTION', 'LOSS_OF_PRIVILEGE', 'PIP', 'TRANSFER', 'TERMINATION_RECOMMENDATION');

-- CreateEnum
CREATE TYPE "DisciplinaryCaseStatus" AS ENUM ('REPORTED', 'UNDER_REVIEW', 'INVESTIGATING', 'EMPLOYEE_NOTIFIED', 'HEARING_SCHEDULED', 'DECISION_PENDING', 'APPROVED', 'REJECTED', 'APPEALED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SuspensionType" AS ENUM ('WITH_PAY', 'WITHOUT_PAY', 'INVESTIGATIVE', 'ADMIN_LEAVE', 'TEMP_DUTY_REMOVAL');

-- CreateEnum
CREATE TYPE "GrievanceStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'INVESTIGATION', 'MEDIATION', 'RESOLVED', 'ESCALATED', 'CLOSED');

-- CreateEnum
CREATE TYPE "GrievanceType" AS ENUM ('HARASSMENT', 'SALARY_DISPUTE', 'SUPERVISOR_COMPLAINT', 'UNSAFE_CONDITIONS', 'DISCRIMINATION', 'UNFAIR_TREATMENT', 'WORKLOAD', 'SHIFT_ROSTER', 'OTHER');

-- CreateEnum
CREATE TYPE "StaffLoanStatus" AS ENUM ('PENDING', 'APPROVED', 'ACTIVE', 'SETTLED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('APPLIED', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'INTERVIEWED', 'OFFER_EXTENDED', 'HIRED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "AttendanceAnomalyType" AS ENUM ('REPEATED_LATENESS', 'NO_CLOCK_OUT', 'EARLY_DEPARTURE', 'UNAUTHORIZED_ABSENCE', 'EXCESSIVE_OVERTIME', 'MISSED_SHIFT', 'SUSPICIOUS_EDIT', 'ROSTER_CONFLICT', 'HALF_DAY_PATTERN');

-- CreateEnum
CREATE TYPE "DeductionCategory" AS ENUM ('DAMAGE_RECOVERY', 'UNAUTHORIZED_ABSENCE', 'CASH_SHORTAGE', 'TILL_VARIANCE', 'SALARY_ADVANCE', 'LOAN_RECOVERY', 'ASSET_LOSS', 'DISCIPLINARY_FINE', 'UNIFORM_RECOVERY', 'DEVICE_RECOVERY', 'OTHER');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('MORNING', 'AFTERNOON', 'NIGHT', 'SPLIT', 'OFF_DAY', 'ON_CALL');

-- CreateEnum
CREATE TYPE "SeparationType" AS ENUM ('RESIGNATION', 'TERMINATION', 'END_OF_CONTRACT', 'RETIREMENT', 'DISMISSAL', 'ABSCONDED', 'REDUNDANCY');

-- CreateEnum
CREATE TYPE "ProbationOutcome" AS ENUM ('CONFIRMED', 'EXTENDED', 'TERMINATED', 'PENDING');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EmployeeStatus" ADD VALUE 'RESIGNED';
ALTER TYPE "EmployeeStatus" ADD VALUE 'RETIRED';
ALTER TYPE "EmployeeStatus" ADD VALUE 'PROBATION';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeaveType" ADD VALUE 'CASUAL';
ALTER TYPE "LeaveType" ADD VALUE 'EMERGENCY';
ALTER TYPE "LeaveType" ADD VALUE 'SUSPENSION';

-- DropForeignKey
ALTER TABLE "night_audits" DROP CONSTRAINT "night_audits_propertyId_fkey";

-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "editHistory" JSONB,
ADD COLUMN     "recordedById" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'MANAGER_ENTRY',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "contractEndDate" TIMESTAMP(3),
ADD COLUMN     "mobileMoney" TEXT,
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "nextOfKin" TEXT,
ADD COLUMN     "nextOfKinPhone" TEXT,
ADD COLUMN     "preferredName" TEXT,
ADD COLUMN     "probationConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "probationEndDate" TIMESTAMP(3),
ADD COLUMN     "probationStartDate" TIMESTAMP(3),
ADD COLUMN     "supervisorId" TEXT,
ADD COLUMN     "taxId" TEXT;

-- AlterTable
ALTER TABLE "guests" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "night_audits" ALTER COLUMN "auditDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "closedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "performance_reviews" ADD COLUMN     "incrementRecommended" DECIMAL(10,2),
ADD COLUMN     "kpis" JSONB,
ADD COLUMN     "promotionRecommended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewType" TEXT NOT NULL DEFAULT 'ANNUAL';

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "emailConfig" JSONB,
ADD COLUMN     "policyConfig" JSONB;

-- AlterTable
ALTER TABLE "reservations" ALTER COLUMN "holdExpiresAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "probation_reviews" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "scheduledDate" DATE NOT NULL,
    "conductedAt" TIMESTAMP(3),
    "outcome" "ProbationOutcome" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "supervisorRecommendation" TEXT,
    "hrRecommendation" TEXT,
    "finalDecision" TEXT,
    "extensionDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "probation_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disciplinary_cases" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "incidentDate" DATE NOT NULL,
    "reportedById" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "witnesses" TEXT,
    "investigationNotes" TEXT,
    "status" "DisciplinaryCaseStatus" NOT NULL DEFAULT 'REPORTED',
    "decisionDate" TIMESTAMP(3),
    "decisionMakerId" TEXT,
    "effectiveDate" DATE,
    "appealDeadline" DATE,
    "finalOutcome" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disciplinary_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disciplinary_actions" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "actionType" "DisciplinaryActionType" NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "endDate" DATE,
    "description" TEXT,
    "issuedById" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disciplinary_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_deductions" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "disciplinaryCaseId" TEXT,
    "staffLoanId" TEXT,
    "category" "DeductionCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "deductionType" TEXT NOT NULL DEFAULT 'FIXED',
    "effectivePeriod" TEXT NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "installmentTotal" INTEGER,
    "installmentPaid" INTEGER NOT NULL DEFAULT 0,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payslipVisible" BOOLEAN NOT NULL DEFAULT true,
    "glAccountCode" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suspension_records" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "disciplinaryCaseId" TEXT,
    "suspensionType" "SuspensionType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "returnDate" DATE,
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT NOT NULL,
    "approvedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suspension_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grievance_cases" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "grievanceType" "GrievanceType" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "GrievanceStatus" NOT NULL DEFAULT 'SUBMITTED',
    "assignedToId" TEXT,
    "resolutionNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grievance_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_loans" (
    "id" TEXT NOT NULL,
    "loanNumber" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "loanType" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL,
    "interestRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "installmentAmount" DECIMAL(12,2) NOT NULL,
    "installments" INTEGER NOT NULL DEFAULT 1,
    "status" "StaffLoanStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "disbursedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_loan_repayments" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payrollPeriod" TEXT,
    "method" TEXT NOT NULL DEFAULT 'PAYROLL_DEDUCTION',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_loan_repayments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_asset_issues" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "serialNumber" TEXT,
    "issuedDate" DATE NOT NULL,
    "issuedById" TEXT,
    "expectedReturn" DATE,
    "returnedDate" DATE,
    "conditionOnIssue" TEXT NOT NULL DEFAULT 'GOOD',
    "conditionOnReturn" TEXT,
    "replacementCost" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "recoveryDeductionId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_asset_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_anomalies" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "anomalyType" "AttendanceAnomalyType" NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reviewedById" TEXT,
    "reviewNotes" TEXT,
    "linkedCaseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_rosters" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "shiftDate" DATE NOT NULL,
    "shiftType" TEXT NOT NULL DEFAULT 'MORNING',
    "startTime" TEXT,
    "endTime" TEXT,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "swapRequestedWith" TEXT,
    "swapApproved" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_rosters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_type_configs" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_type_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_programs" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "requiredFor" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "durationHours" DECIMAL(5,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_attendances" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "score" DECIMAL(5,2),
    "passed" BOOLEAN,
    "notes" TEXT,
    "certUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruitment_job_openings" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "departmentId" TEXT,
    "description" TEXT,
    "requirements" TEXT,
    "salaryMin" DECIMAL(12,2),
    "salaryMax" DECIMAL(12,2),
    "openDate" DATE NOT NULL,
    "closeDate" DATE,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "hiringManagerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recruitment_job_openings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "jobOpeningId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "resumeUrl" TEXT,
    "status" "CandidateStatus" NOT NULL DEFAULT 'APPLIED',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "offerSalary" DECIMAL(12,2),
    "hiredAsEmployeeId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_interviews" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "interviewerId" TEXT,
    "format" TEXT NOT NULL DEFAULT 'IN_PERSON',
    "score" DECIMAL(5,2),
    "notes" TEXT,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_checklists" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'PENDING',
    "contractUploaded" BOOLEAN NOT NULL DEFAULT false,
    "idCaptured" BOOLEAN NOT NULL DEFAULT false,
    "roleAssigned" BOOLEAN NOT NULL DEFAULT false,
    "payrollCreated" BOOLEAN NOT NULL DEFAULT false,
    "deptAssigned" BOOLEAN NOT NULL DEFAULT false,
    "uniformIssued" BOOLEAN NOT NULL DEFAULT false,
    "systemAccess" BOOLEAN NOT NULL DEFAULT false,
    "orientationDone" BOOLEAN NOT NULL DEFAULT false,
    "policyAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offboarding_cases" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "separationType" "SeparationType" NOT NULL,
    "noticeDate" DATE,
    "lastWorkingDate" DATE,
    "letterUploaded" BOOLEAN NOT NULL DEFAULT false,
    "finalPayProcessed" BOOLEAN NOT NULL DEFAULT false,
    "deductionsSettled" BOOLEAN NOT NULL DEFAULT false,
    "handoverCompleted" BOOLEAN NOT NULL DEFAULT false,
    "assetsReturned" BOOLEAN NOT NULL DEFAULT false,
    "accessRevoked" BOOLEAN NOT NULL DEFAULT false,
    "exitInterviewDone" BOOLEAN NOT NULL DEFAULT false,
    "finalDocumentsIssued" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "processedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offboarding_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_documents" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "expiryDate" DATE,
    "uploadedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_documents" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "content" TEXT,
    "fileUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_acknowledgements" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "policy_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_handling_incidents" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "incidentType" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "description" TEXT NOT NULL,
    "incidentDate" DATE NOT NULL,
    "reportedById" TEXT,
    "disciplinaryCaseId" TEXT,
    "recoveryDeductionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_handling_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_benefits" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "benefitType" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_incidents" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "incidentType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "incidentDate" DATE NOT NULL,
    "location" TEXT,
    "witnesses" TEXT,
    "evidenceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "followUpActions" TEXT,
    "returnToWorkDate" DATE,
    "reportedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_approval_requests" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "disciplinary_cases_caseNumber_key" ON "disciplinary_cases"("caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "grievance_cases_caseNumber_key" ON "grievance_cases"("caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "staff_loans_loanNumber_key" ON "staff_loans"("loanNumber");

-- CreateIndex
CREATE UNIQUE INDEX "shift_rosters_employeeId_shiftDate_key" ON "shift_rosters"("employeeId", "shiftDate");

-- CreateIndex
CREATE UNIQUE INDEX "shift_type_configs_propertyId_name_key" ON "shift_type_configs"("propertyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_checklists_employeeId_key" ON "onboarding_checklists"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "offboarding_cases_employeeId_key" ON "offboarding_cases"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "policy_acknowledgements_policyId_employeeId_key" ON "policy_acknowledgements"("policyId", "employeeId");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "probation_reviews" ADD CONSTRAINT "probation_reviews_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disciplinary_cases" ADD CONSTRAINT "disciplinary_cases_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disciplinary_actions" ADD CONSTRAINT "disciplinary_actions_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "disciplinary_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deductions" ADD CONSTRAINT "payroll_deductions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deductions" ADD CONSTRAINT "payroll_deductions_disciplinaryCaseId_fkey" FOREIGN KEY ("disciplinaryCaseId") REFERENCES "disciplinary_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deductions" ADD CONSTRAINT "payroll_deductions_staffLoanId_fkey" FOREIGN KEY ("staffLoanId") REFERENCES "staff_loans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspension_records" ADD CONSTRAINT "suspension_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspension_records" ADD CONSTRAINT "suspension_records_disciplinaryCaseId_fkey" FOREIGN KEY ("disciplinaryCaseId") REFERENCES "disciplinary_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grievance_cases" ADD CONSTRAINT "grievance_cases_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_loans" ADD CONSTRAINT "staff_loans_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_loan_repayments" ADD CONSTRAINT "staff_loan_repayments_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "staff_loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_asset_issues" ADD CONSTRAINT "employee_asset_issues_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_anomalies" ADD CONSTRAINT "attendance_anomalies_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_rosters" ADD CONSTRAINT "shift_rosters_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_type_configs" ADD CONSTRAINT "shift_type_configs_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_attendances" ADD CONSTRAINT "training_attendances_programId_fkey" FOREIGN KEY ("programId") REFERENCES "training_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_attendances" ADD CONSTRAINT "training_attendances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_jobOpeningId_fkey" FOREIGN KEY ("jobOpeningId") REFERENCES "recruitment_job_openings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_interviews" ADD CONSTRAINT "candidate_interviews_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_checklists" ADD CONSTRAINT "onboarding_checklists_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offboarding_cases" ADD CONSTRAINT "offboarding_cases_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_acknowledgements" ADD CONSTRAINT "policy_acknowledgements_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policy_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_acknowledgements" ADD CONSTRAINT "policy_acknowledgements_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_handling_incidents" ADD CONSTRAINT "cash_handling_incidents_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_benefits" ADD CONSTRAINT "employee_benefits_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_incidents" ADD CONSTRAINT "employee_incidents_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "night_audits" ADD CONSTRAINT "night_audits_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
