-- CreateEnum
CREATE TYPE "ShortStayStatus" AS ENUM ('CHECKED_IN', 'CHECKED_OUT', 'CANCELLED');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "shortStayBookingId" TEXT;

-- CreateTable
CREATE TABLE "short_stay_bookings" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "guestId" TEXT,
    "guestName" TEXT,
    "guestPhone" TEXT,
    "checkIn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOutPlanned" TIMESTAMP(3) NOT NULL,
    "checkOutActual" TIMESTAMP(3),
    "durationHours" INTEGER NOT NULL,
    "hourlyRate" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "status" "ShortStayStatus" NOT NULL DEFAULT 'CHECKED_IN',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "short_stay_bookings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "short_stay_bookings" ADD CONSTRAINT "short_stay_bookings_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_stay_bookings" ADD CONSTRAINT "short_stay_bookings_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_stay_bookings" ADD CONSTRAINT "short_stay_bookings_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_stay_bookings" ADD CONSTRAINT "short_stay_bookings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_shortStayBookingId_fkey" FOREIGN KEY ("shortStayBookingId") REFERENCES "short_stay_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
