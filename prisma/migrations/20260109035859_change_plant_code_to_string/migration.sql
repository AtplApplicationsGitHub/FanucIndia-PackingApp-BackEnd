/*
  Warnings:

  - You are about to drop the column `plantCodeId` on the `SalesOrder` table. All the data in the column will be lost.
  - You are about to drop the column `plantCodeId` on the `SalesOrderArchive` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "SalesOrder" DROP CONSTRAINT "SalesOrder_plantCodeId_fkey";

-- AlterTable
ALTER TABLE "SalesOrder" DROP COLUMN "plantCodeId",
ADD COLUMN     "plantCode" VARCHAR(100);

-- AlterTable
ALTER TABLE "SalesOrderArchive" DROP COLUMN "plantCodeId",
ADD COLUMN     "plantCode" VARCHAR(100);
