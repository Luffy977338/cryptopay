/*
  Warnings:

  - You are about to drop the column `walletId` on the `Order` table. All the data in the column will be lost.
  - Added the required column `wallet` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_walletId_fkey";

-- DropIndex
DROP INDEX "Order_walletId_key";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "walletId",
ADD COLUMN     "wallet" TEXT NOT NULL;
