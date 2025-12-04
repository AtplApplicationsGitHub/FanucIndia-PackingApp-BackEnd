/*
  Warnings:

  - You are about to drop the column `address` on the `DispatchArchive` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `DispatchArchive` table. All the data in the column will be lost.
  - You are about to drop the column `customerName` on the `DispatchArchive` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DispatchArchive" DROP COLUMN "address",
DROP COLUMN "customerId",
DROP COLUMN "customerName";
