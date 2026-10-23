-- AlterTable
ALTER TABLE "BomAudit" ADD COLUMN     "reportAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reportError" VARCHAR(1000),
ADD COLUMN     "reportGeneratedAt" TIMESTAMPTZ(3),
ADD COLUMN     "reportPath" VARCHAR(500);
