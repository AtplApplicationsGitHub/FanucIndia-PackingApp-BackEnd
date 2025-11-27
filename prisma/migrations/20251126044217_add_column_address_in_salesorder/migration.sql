-- AlterTable
ALTER TABLE "SalesOrder" ADD COLUMN     "address" VARCHAR(1000);

-- AlterTable
ALTER TABLE "SalesOrderArchive" ADD COLUMN     "address" TEXT;
