-- AlterTable
ALTER TABLE "SalesOrder" ADD COLUMN     "FGUpdatedBy" VARCHAR(255),
ADD COLUMN     "FGUpdatedDateTime" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SalesOrderArchive" ADD COLUMN     "FGUpdatedBy" VARCHAR(255),
ADD COLUMN     "FGUpdatedDateTime" TIMESTAMP(3);
