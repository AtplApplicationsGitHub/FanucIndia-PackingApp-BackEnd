-- AlterTable
ALTER TABLE "BomAudit" ADD COLUMN     "closedAt" TIMESTAMPTZ(3),
ADD COLUMN     "closedByName" VARCHAR(255);

-- AlterTable
ALTER TABLE "BomAuditMaterial" ADD COLUMN     "reconDecision" VARCHAR(40),
ADD COLUMN     "reconRemarks" TEXT,
ADD COLUMN     "reconSapAction" VARCHAR(40) NOT NULL DEFAULT 'NONE',
ADD COLUMN     "resolvedAt" TIMESTAMPTZ(3),
ADD COLUMN     "resolvedByName" VARCHAR(255);
