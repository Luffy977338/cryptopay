/*
  Warnings:

  - You are about to drop the column `userId` on the `Order` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[walletId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `walletId` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";

-- DropIndex
DROP INDEX "Order_userId_key";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "userId",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "walletId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Order_walletId_key" ON "Order"("walletId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
