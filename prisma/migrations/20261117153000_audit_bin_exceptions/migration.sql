ALTER TABLE "BomAuditLocation" ADD COLUMN "skipReason" VARCHAR(1000), ADD COLUMN "skippedAt" TIMESTAMPTZ(3);
ALTER TABLE "BomAuditMaterial" ADD COLUMN "operatorRemarks" VARCHAR(1000), ADD COLUMN "soNumber" VARCHAR(100);
ALTER TABLE "CycleCountAuditLocation" ADD COLUMN "skipReason" VARCHAR(1000), ADD COLUMN "skippedAt" TIMESTAMPTZ(3);
ALTER TABLE "CycleCountAuditMaterial" ADD COLUMN "operatorRemarks" VARCHAR(1000), ADD COLUMN "soNumber" VARCHAR(100);
