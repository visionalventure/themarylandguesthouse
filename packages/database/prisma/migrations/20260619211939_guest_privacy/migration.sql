-- CreateEnum
CREATE TYPE "GuestPrivacyType" AS ENUM ('STANDARD', 'PRIVATE', 'VIP', 'CONFIDENTIAL');

-- AlterTable
ALTER TABLE "guests" ADD COLUMN     "alias" TEXT,
ADD COLUMN     "privacyType" "GuestPrivacyType" NOT NULL DEFAULT 'STANDARD';

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "allowAnonymousWalkIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requireAddress" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requireIdentification" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requirePhone" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "guest_privacy_logs" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "viewedBy" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "ipAddress" TEXT,
    "action" TEXT NOT NULL,

    CONSTRAINT "guest_privacy_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "guest_privacy_logs" ADD CONSTRAINT "guest_privacy_logs_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
