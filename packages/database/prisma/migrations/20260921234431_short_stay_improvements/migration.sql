-- AlterEnum
ALTER TYPE "ShortStayStatus" ADD VALUE 'UPGRADED';

-- AlterTable
ALTER TABLE "room_categories" ADD COLUMN     "hourlyRate" DECIMAL(10,2),
ADD COLUMN     "isShortStayEligible" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "short_stay_bookings" ADD COLUMN     "upgradedReservationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "short_stay_bookings_upgradedReservationId_key" ON "short_stay_bookings"("upgradedReservationId");
