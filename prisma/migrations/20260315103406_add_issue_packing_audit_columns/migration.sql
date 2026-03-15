-- AlterTable
ALTER TABLE "ERP_Material_Data" ADD COLUMN     "IssueUpdatedBy" VARCHAR(50),
ADD COLUMN     "IssueUpdatedDate" TIMESTAMP(3),
ADD COLUMN     "PackingUpdatedBy" VARCHAR(50),
ADD COLUMN     "PackingUpdatedDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ERP_Material_DataArchive" ADD COLUMN     "IssueUpdatedBy" VARCHAR(50),
ADD COLUMN     "IssueUpdatedDate" TIMESTAMP(3),
ADD COLUMN     "PackingUpdatedBy" VARCHAR(50),
ADD COLUMN     "PackingUpdatedDate" TIMESTAMP(3);
