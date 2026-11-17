-- Keep existing audits and scans intact; their previously merged certificates are unknown.
ALTER TABLE "BomAuditMaterial" ADD COLUMN "ydNumber" VARCHAR(255);
ALTER TABLE "CycleCountAuditMaterial" ADD COLUMN "ydNumber" VARCHAR(255);
DROP INDEX "BomAuditMaterial_auditLocationId_materialCode_key";
DROP INDEX "CycleCountAuditMaterial_auditLocationId_materialCode_key";
CREATE INDEX "BomAuditMaterial_auditLocationId_materialCode_idx" ON "BomAuditMaterial"("auditLocationId", "materialCode");
CREATE INDEX "CycleCountAuditMaterial_auditLocationId_materialCode_idx" ON "CycleCountAuditMaterial"("auditLocationId", "materialCode");
