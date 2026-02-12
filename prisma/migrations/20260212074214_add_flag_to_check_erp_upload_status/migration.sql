-- AlterTable
ALTER TABLE "SalesOrder" ADD COLUMN     "isErpImported" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SalesOrderArchive" ADD COLUMN     "isErpImported" INTEGER;
