/*
  Warnings:

  - A unique constraint covering the columns `[name,address]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Customer_name_address_key" ON "Customer"("name", "address");
