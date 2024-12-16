/*
  Warnings:

  - You are about to drop the column `transactionIds` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "transactionIds";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "transactionIds" TEXT[];
