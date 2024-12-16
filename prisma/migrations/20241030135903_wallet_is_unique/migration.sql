/*
  Warnings:

  - A unique constraint covering the columns `[wallet]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[wallet]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Order_wallet_key" ON "Order"("wallet");

-- CreateIndex
CREATE UNIQUE INDEX "User_wallet_key" ON "User"("wallet");
