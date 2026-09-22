-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "restaurantOrderId" TEXT;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_restaurantOrderId_fkey" FOREIGN KEY ("restaurantOrderId") REFERENCES "restaurant_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
