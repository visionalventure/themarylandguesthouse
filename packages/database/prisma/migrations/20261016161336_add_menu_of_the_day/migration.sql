-- CreateTable
CREATE TABLE "menu_of_the_day" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_of_the_day_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "menu_of_the_day_restaurantId_date_key" ON "menu_of_the_day"("restaurantId", "date");

-- CreateTable
CREATE TABLE "menu_of_the_day_entries" (
    "id" TEXT NOT NULL,
    "menuOfTheDayId" TEXT NOT NULL,
    "menuItemId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "allergens" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "isVegetarian" BOOLEAN NOT NULL DEFAULT false,
    "isVegan" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_of_the_day_entries_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "menu_of_the_day" ADD CONSTRAINT "menu_of_the_day_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_of_the_day" ADD CONSTRAINT "menu_of_the_day_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_of_the_day_entries" ADD CONSTRAINT "menu_of_the_day_entries_menuOfTheDayId_fkey" FOREIGN KEY ("menuOfTheDayId") REFERENCES "menu_of_the_day"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_of_the_day_entries" ADD CONSTRAINT "menu_of_the_day_entries_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enable RLS on the new tables to stay consistent with the project-wide
-- lockdown of Supabase's public PostgREST API (no policies defined, so
-- the anon/authenticated roles get zero rows; the app's own Prisma
-- connection, as the table owner, is unaffected).
ALTER TABLE "menu_of_the_day" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "menu_of_the_day_entries" ENABLE ROW LEVEL SECURITY;
