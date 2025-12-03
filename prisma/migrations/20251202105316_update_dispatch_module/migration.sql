/*
  Warnings:

  - You are about to drop the column `address` on the `Dispatch` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `Dispatch` table. All the data in the column will be lost.
  - You are about to drop the column `customerName` on the `Dispatch` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Dispatch" DROP CONSTRAINT "Dispatch_customerId_fkey";

-- AlterTable
ALTER TABLE "Dispatch" DROP COLUMN "address",
DROP COLUMN "customerId",
DROP COLUMN "customerName";
