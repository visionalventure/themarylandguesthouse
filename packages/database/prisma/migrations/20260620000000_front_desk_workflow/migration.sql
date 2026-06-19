-- Front Desk & Financial Workflow Migration
-- Adds: receiptNumber on payments, holdExpiresAt on reservations,
--       VACANT_DIRTY + BLOCKED room statuses, NightAudit table

ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "holdExpiresAt" TIMESTAMPTZ;
ALTER TABLE "payments"     ADD COLUMN IF NOT EXISTS "receiptNumber" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "payments_receiptNumber_key" ON "payments"("receiptNumber");

-- PostgreSQL ALTER TYPE ADD VALUE is not transactional; use DO block for safety
DO $$ BEGIN
  ALTER TYPE "RoomStatus" ADD VALUE IF NOT EXISTS 'VACANT_DIRTY';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "RoomStatus" ADD VALUE IF NOT EXISTS 'BLOCKED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "night_audits" (
  "id"             TEXT NOT NULL,
  "propertyId"     TEXT NOT NULL,
  "auditDate"      TIMESTAMPTZ NOT NULL,
  "status"         TEXT NOT NULL DEFAULT 'OPEN',
  "totalRevenue"   DECIMAL(12,2) NOT NULL DEFAULT 0,
  "totalPayments"  DECIMAL(12,2) NOT NULL DEFAULT 0,
  "occupancyRate"  DECIMAL(5,2)  NOT NULL DEFAULT 0,
  "roomsOccupied"  INTEGER NOT NULL DEFAULT 0,
  "roomsAvailable" INTEGER NOT NULL DEFAULT 0,
  "newArrivals"    INTEGER NOT NULL DEFAULT 0,
  "departures"     INTEGER NOT NULL DEFAULT 0,
  "noShows"        INTEGER NOT NULL DEFAULT 0,
  "cashOnHand"     DECIMAL(12,2) NOT NULL DEFAULT 0,
  "discrepancies"  JSONB,
  "runBy"          TEXT,
  "closedAt"       TIMESTAMPTZ,
  "notes"          TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "night_audits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "night_audits_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS "night_audits_propertyId_auditDate_key"
  ON "night_audits"("propertyId", "auditDate");
