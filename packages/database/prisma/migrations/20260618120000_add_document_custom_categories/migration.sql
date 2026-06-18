-- AlterTable: add customCategory to documents
ALTER TABLE "documents" ADD COLUMN "customCategory" TEXT;

-- CreateTable: document_custom_categories
CREATE TABLE "document_custom_categories" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'slate',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_custom_categories_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "document_custom_categories_propertyId_name_key" ON "document_custom_categories"("propertyId", "name");

-- AddForeignKey
ALTER TABLE "document_custom_categories" ADD CONSTRAINT "document_custom_categories_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
