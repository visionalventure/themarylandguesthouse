-- Inquiry.type moves from a fixed enum to free text, so a category typed
-- into the "Add new category" field on the frontend can be stored directly
-- and reused going forward without a schema change each time.
ALTER TABLE "inquiries" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "inquiries" ALTER COLUMN "type" TYPE TEXT USING "type"::TEXT;
ALTER TABLE "inquiries" ALTER COLUMN "type" SET DEFAULT 'OTHER';
DROP TYPE "InquiryType";
