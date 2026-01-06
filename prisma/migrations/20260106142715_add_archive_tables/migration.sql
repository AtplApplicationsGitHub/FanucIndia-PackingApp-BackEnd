/*
  Warnings:

  - You are about to drop the column `customerId` on the `ERP_Material_Data` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `ERP_Material_DataArchive` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ERP_Material_Data" DROP CONSTRAINT "ERP_Material_Data_customerId_fkey";

-- AlterTable
ALTER TABLE "ERP_Material_Data" DROP COLUMN "customerId";

-- AlterTable
ALTER TABLE "ERP_Material_DataArchive" DROP COLUMN "customerId";

-- AlterTable
ALTER TABLE "SalesOrderArchive" ADD COLUMN     "customerNameText" VARCHAR(500);

-- CreateTable
CREATE TABLE "SalesOrderChatMessageArchive" (
    "id" INTEGER NOT NULL,
    "salesOrderNumber" VARCHAR(500) NOT NULL,
    "fromUserId" INTEGER NOT NULL,
    "toUserId" INTEGER NOT NULL,
    "message" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesOrderChatMessageArchive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoChatNotificationArchive" (
    "id" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "salesOrderNumber" VARCHAR(500) NOT NULL,
    "messageId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SoChatNotificationArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesOrderChatMessageArchive_salesOrderNumber_createdAt_idx" ON "SalesOrderChatMessageArchive"("salesOrderNumber", "createdAt");

-- CreateIndex
CREATE INDEX "SoChatNotificationArchive_userId_createdAt_idx" ON "SoChatNotificationArchive"("userId", "createdAt");
