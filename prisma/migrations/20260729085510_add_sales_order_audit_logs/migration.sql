-- AlterTable
ALTER TABLE "SalesOrder" ADD COLUMN     "audit_logs" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "SalesOrderArchive" ADD COLUMN     "audit_logs" JSONB NOT NULL DEFAULT '[]';
