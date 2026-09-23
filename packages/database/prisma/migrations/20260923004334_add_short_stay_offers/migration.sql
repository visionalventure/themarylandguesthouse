-- CreateTable
CREATE TABLE "short_stay_offers" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hourlyRate" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "short_stay_offers_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "short_stay_offers" ADD CONSTRAINT "short_stay_offers_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: rooms get an optional assigned short-stay offer
ALTER TABLE "rooms" ADD COLUMN "shortStayOfferId" TEXT;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_shortStayOfferId_fkey" FOREIGN KEY ("shortStayOfferId") REFERENCES "short_stay_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: turn every short-stay-eligible category into a named offer
-- (preserving its existing hourly rate), deterministically keyed off the
-- category id so rooms can be repointed without a fragile name join.
INSERT INTO "short_stay_offers" ("id", "propertyId", "name", "hourlyRate", "isActive", "createdAt", "updatedAt")
SELECT 'sso_' || rc."id", rc."propertyId", rc."name" || ' Short Stay', COALESCE(rc."hourlyRate", 0), true, now(), now()
FROM "room_categories" rc
WHERE rc."isShortStayEligible" = true;

UPDATE "rooms" r
SET "shortStayOfferId" = 'sso_' || r."categoryId"
WHERE EXISTS (
  SELECT 1 FROM "room_categories" rc WHERE rc."id" = r."categoryId" AND rc."isShortStayEligible" = true
);

-- AlterTable: drop the now-superseded category-level short-stay fields
ALTER TABLE "room_categories" DROP COLUMN "hourlyRate";
ALTER TABLE "room_categories" DROP COLUMN "isShortStayEligible";
