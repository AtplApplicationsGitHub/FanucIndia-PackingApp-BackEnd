-- Remove only the retired Cycle Count tables and their data.
-- Keep existing migration history and the shared AuditNoSequence table.
-- Drop children before parents; do not cascade into unrelated objects.
BEGIN;

DROP TABLE "CycleCountMaterial";
DROP TABLE "CycleCountLocation";
DROP TABLE "CycleCountAudit";
DROP TABLE "CycleCountStockRow";
DROP TABLE "CycleCountStockUpload";

COMMIT;
