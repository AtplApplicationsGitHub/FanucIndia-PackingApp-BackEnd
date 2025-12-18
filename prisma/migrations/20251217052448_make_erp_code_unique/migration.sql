/*
  Warnings:

  - A unique constraint covering the columns `[erpCode]` on the table `MaterialBarcode` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "MaterialBarcode_erpCode_key" ON "MaterialBarcode"("erpCode");
