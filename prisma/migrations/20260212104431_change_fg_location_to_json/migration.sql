/*
  Warnings:

  - The `fgLocation` column on the `SalesOrder` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `fgLocation` column on the `SalesOrderArchive` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "SalesOrder" DROP COLUMN "fgLocation",
ADD COLUMN     "fgLocation" JSONB;

-- AlterTable
ALTER TABLE "SalesOrderArchive" DROP COLUMN "fgLocation",
ADD COLUMN     "fgLocation" JSONB;
