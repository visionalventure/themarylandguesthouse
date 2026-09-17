-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "tokenHash" TEXT,
ALTER COLUMN "token" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedUntil" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");
