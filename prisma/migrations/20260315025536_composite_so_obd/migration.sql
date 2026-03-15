/*
  Warnings:

  - A unique constraint covering the columns `[dispatchId,salesOrderId]` on the table `Dispatch_SO` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[salesOrderId,status]` on the table `SO_Status_Stepper` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[saleOrderNumber,outboundDelivery]` on the table `SalesOrder` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `salesOrderId` to the `CustomerLabelPrintEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `salesOrderId` to the `Dispatch_SO` table without a default value. This is not possible if the table is not empty.
  - Added the required column `salesOrderId` to the `Dispatch_SOArchive` table without a default value. This is not possible if the table is not empty.
  - Added the required column `salesOrderId` to the `SO_Status_Stepper` table without a default value. This is not possible if the table is not empty.
  - Added the required column `salesOrderId` to the `SO_Status_StepperArchive` table without a default value. This is not possible if the table is not empty.
  - Added the required column `salesOrderId` to the `SalesOrderChatMessageArchive` table without a default value. This is not possible if the table is not empty.
  - Added the required column `salesOrderId` to the `SoChatNotificationArchive` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Dispatch_SO" DROP CONSTRAINT "Dispatch_SO_saleOrderNumber_fkey";

-- DropForeignKey
ALTER TABLE "ERP_Material_Data" DROP CONSTRAINT "ERP_Material_Data_saleOrderNumber_fkey";

-- DropForeignKey
ALTER TABLE "ERP_Material_File" DROP CONSTRAINT "ERP_Material_File_saleOrderNumber_fkey";

-- DropForeignKey
ALTER TABLE "SO_Status_Stepper" DROP CONSTRAINT "SO_Status_Stepper_salesOrderNumber_fkey";

-- DropIndex
DROP INDEX "Dispatch_SO_dispatchId_saleOrderNumber_key";

-- DropIndex
DROP INDEX "ERP_Material_File_saleOrderNumber_fileName_idx";

-- DropIndex
DROP INDEX "SO_Status_Stepper_salesOrderNumber_status_key";

-- DropIndex
DROP INDEX "SalesOrder_outboundDelivery_key";

-- DropIndex
DROP INDEX "SalesOrder_saleOrderNumber_key";

-- DropIndex
DROP INDEX "SalesOrderChatMessageArchive_salesOrderNumber_createdAt_idx";

-- AlterTable
ALTER TABLE "CustomerLabelPrintEntry" ADD COLUMN     "salesOrderId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Dispatch_SO" ADD COLUMN     "salesOrderId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Dispatch_SOArchive" ADD COLUMN     "salesOrderId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "ERP_Material_Data" ADD COLUMN     "salesOrderId" INTEGER;

-- AlterTable
ALTER TABLE "ERP_Material_DataArchive" ADD COLUMN     "salesOrderId" INTEGER;

-- AlterTable
ALTER TABLE "ERP_Material_File" ADD COLUMN     "salesOrderId" INTEGER;

-- AlterTable
ALTER TABLE "ERP_Material_FileArchive" ADD COLUMN     "salesOrderId" INTEGER;

-- AlterTable
ALTER TABLE "SO_Status_Stepper" ADD COLUMN     "salesOrderId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "SO_Status_StepperArchive" ADD COLUMN     "salesOrderId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "SalesOrderChatMessageArchive" ADD COLUMN     "salesOrderId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "SoChatNotificationArchive" ADD COLUMN     "salesOrderId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Dispatch_SO_dispatchId_salesOrderId_key" ON "Dispatch_SO"("dispatchId", "salesOrderId");

-- CreateIndex
CREATE INDEX "ERP_Material_File_salesOrderId_fileName_idx" ON "ERP_Material_File"("salesOrderId", "fileName");

-- CreateIndex
CREATE UNIQUE INDEX "SO_Status_Stepper_salesOrderId_status_key" ON "SO_Status_Stepper"("salesOrderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_saleOrderNumber_outboundDelivery_key" ON "SalesOrder"("saleOrderNumber", "outboundDelivery");

-- CreateIndex
CREATE INDEX "SalesOrderChatMessageArchive_salesOrderId_createdAt_idx" ON "SalesOrderChatMessageArchive"("salesOrderId", "createdAt");

-- AddForeignKey
ALTER TABLE "ERP_Material_Data" ADD CONSTRAINT "ERP_Material_Data_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ERP_Material_File" ADD CONSTRAINT "ERP_Material_File_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Dispatch_SO" ADD CONSTRAINT "Dispatch_SO_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SO_Status_Stepper" ADD CONSTRAINT "SO_Status_Stepper_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
