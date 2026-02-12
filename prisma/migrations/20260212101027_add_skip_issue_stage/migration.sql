-- AlterTable
ALTER TABLE "ERP_Material_Data" ADD COLUMN     "skipIssueStage" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ERP_Material_DataArchive" ADD COLUMN     "skipIssueStage" BOOLEAN NOT NULL DEFAULT false;
