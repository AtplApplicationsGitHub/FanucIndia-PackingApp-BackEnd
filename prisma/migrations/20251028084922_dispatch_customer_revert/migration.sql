/*
  Warnings:

  - You are about to drop the column `customerName` on the `Dispatch` table. All the data in the column will be lost.
  - Made the column `customerId` on table `Dispatch` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."Dispatch" DROP CONSTRAINT "Dispatch_customerId_fkey";

-- AlterTable
ALTER TABLE "public"."Dispatch" DROP COLUMN "customerName",
ALTER COLUMN "customerId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Dispatch" ADD CONSTRAINT "Dispatch_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
