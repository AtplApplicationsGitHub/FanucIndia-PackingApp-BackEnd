/*
  Warnings:

  - You are about to drop the column `skipIssueStage` on the `ERP_Material_Data` table. All the data in the column will be lost.
  - You are about to drop the column `skipIssueStage` on the `ERP_Material_DataArchive` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ERP_Material_Data" DROP COLUMN "skipIssueStage";

-- AlterTable
ALTER TABLE "ERP_Material_DataArchive" DROP COLUMN "skipIssueStage";

-- AlterTable
ALTER TABLE "SalesOrder" ADD COLUMN     "skipIssueStage" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SalesOrderArchive" ADD COLUMN     "skipIssueStage" BOOLEAN;
