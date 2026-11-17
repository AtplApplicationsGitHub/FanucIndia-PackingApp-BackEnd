-- Previously imported batch values cannot be reconstructed from audit rows.
ALTER TABLE "BomAuditMaterial" ADD COLUMN "batch" VARCHAR(255);
ALTER TABLE "CycleCountAuditMaterial" ADD COLUMN "batch" VARCHAR(255);
