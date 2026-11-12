-- Preserve stock IDs and their reservation/history relations. Closed records remain unchanged.
BEGIN;
SELECT pg_advisory_xact_lock(74020005::bigint);
DROP INDEX "FreeStockItem_live_material_batch_key";
-- Match the identifier normalization used by new Excel imports.
UPDATE "FreeStockItem"
SET "storageBin" = NULLIF(UPPER(BTRIM(translate("storageBin", chr(8203) || chr(8204) || chr(8205) || chr(8288) || chr(65279), ''))), '')
WHERE "status" <> 'CLOSED' AND "storageBin" IS NOT NULL;
CREATE UNIQUE INDEX "FreeStockItem_live_bin_material_batch_key"
ON "FreeStockItem"("storageBin", "materialCode", "batch") WHERE "status" <> 'CLOSED';
CREATE INDEX "FreeStockItem_storageBin_materialCode_batch_idx"
ON "FreeStockItem"("storageBin", "materialCode", "batch");
COMMIT;
