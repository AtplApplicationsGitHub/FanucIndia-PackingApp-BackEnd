/*
  Warnings:

  - You are about to drop the column `skipIssueStage` on the `SalesOrder` table. All the data in the column will be lost.
  - You are about to drop the column `skipIssueStage` on the `SalesOrderArchive` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SalesOrder" DROP COLUMN "skipIssueStage",
ADD COLUMN     "skipStage" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SalesOrderArchive" DROP COLUMN "skipIssueStage",
ADD COLUMN     "skipStage" BOOLEAN;
