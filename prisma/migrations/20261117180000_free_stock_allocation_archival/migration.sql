BEGIN;
SELECT pg_advisory_xact_lock(74020005::bigint);
-- Repeated stock occurrences are allowed, including identical certificates.
-- The existing active-reservation-per-row guard remains to prevent double booking.
DROP INDEX IF EXISTS "FreeStockItem_live_bin_material_batch_key";
DROP INDEX IF EXISTS "FreeStockItem_live_material_batch_key";
CREATE INDEX "FreeStockItem_storageBin_materialCode_batch_certificateNo_idx"
ON "FreeStockItem"("storageBin", "materialCode", "batch", "certificateNo");
CREATE INDEX "FreeStockReservation_soNumber_idx" ON "FreeStockReservation"("soNumber");

-- Scalar snapshots preserve original IDs and timestamps; no business-key uniqueness.
CREATE TABLE "FreeStockItemArchive" (LIKE "FreeStockItem" INCLUDING DEFAULTS);
ALTER TABLE "FreeStockItemArchive" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "FreeStockItemArchive" ALTER COLUMN "status" SET DEFAULT 'CLOSED';
ALTER TABLE "FreeStockItemArchive" ADD COLUMN "archivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "FreeStockItemArchive" ADD CONSTRAINT "FreeStockItemArchive_pkey" PRIMARY KEY ("id");
CREATE TABLE "FreeStockReservationArchive" (LIKE "FreeStockReservation" INCLUDING DEFAULTS);
ALTER TABLE "FreeStockReservationArchive" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "FreeStockReservationArchive" ADD COLUMN "archivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "FreeStockReservationArchive" ADD CONSTRAINT "FreeStockReservationArchive_pkey" PRIMARY KEY ("id");
ALTER TABLE "FreeStockReservationArchive" ADD CONSTRAINT "FreeStockReservationArchive_stockItemId_fkey"
FOREIGN KEY ("stockItemId") REFERENCES "FreeStockItemArchive"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "FreeStockItemArchive_storageBin_materialCode_batch_idx" ON "FreeStockItemArchive"("storageBin", "materialCode", "batch");
CREATE INDEX "FreeStockItemArchive_materialCode_batch_idx" ON "FreeStockItemArchive"("materialCode", "batch");
CREATE INDEX "FreeStockItemArchive_status_id_idx" ON "FreeStockItemArchive"("status", "id");
CREATE INDEX "FreeStockItemArchive_lastSeenUploadId_idx" ON "FreeStockItemArchive"("lastSeenUploadId");
CREATE INDEX "FreeStockItemArchive_closedByUploadId_idx" ON "FreeStockItemArchive"("closedByUploadId");
CREATE INDEX "FreeStockReservationArchive_stockItemId_reservedAt_idx" ON "FreeStockReservationArchive"("stockItemId", "reservedAt");
CREATE INDEX "FreeStockReservationArchive_owner_state_idx" ON "FreeStockReservationArchive"("reservedById", "releasedAt", "closedAt");
CREATE INDEX "FreeStockReservationArchive_bulkReservationId_idx" ON "FreeStockReservationArchive"("bulkReservationId");
CREATE INDEX "FreeStockItemArchive_closedAt_idx" ON "FreeStockItemArchive"("closedAt");

-- Independent Free Stock column aliases. Existing custom values are preserved.
INSERT INTO "SystemConfig" ("key","value","updatedAt") VALUES ('FREE_STOCK_COLUMN_TYPE','typ',NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "SystemConfig" ("key","value","updatedAt") VALUES ('FREE_STOCK_COLUMN_STORAGE_BIN','storagebin, storage bin',NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "SystemConfig" ("key","value","updatedAt") VALUES ('FREE_STOCK_COLUMN_MATERIAL','material, material code',NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "SystemConfig" ("key","value","updatedAt") VALUES ('FREE_STOCK_COLUMN_PLANT','plnt, plant',NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "SystemConfig" ("key","value","updatedAt") VALUES ('FREE_STOCK_COLUMN_LOCATION','location',NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "SystemConfig" ("key","value","updatedAt") VALUES ('FREE_STOCK_COLUMN_AVAIL','avail',NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "SystemConfig" ("key","value","updatedAt") VALUES ('FREE_STOCK_COLUMN_BATCH','batch',NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "SystemConfig" ("key","value","updatedAt") VALUES ('FREE_STOCK_COLUMN_STOCK','stock',NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "SystemConfig" ("key","value","updatedAt") VALUES ('FREE_STOCK_COLUMN_CERT_NO','certno, cert. no., certificate no',NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "SystemConfig" ("key","value","updatedAt") VALUES ('FREE_STOCK_COLUMN_GR_DATE','grdate',NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "SystemConfig" ("key","value","updatedAt") VALUES ('FREE_STOCK_COLUMN_GR_NUMBER','grnumber',NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "SystemConfig" ("key","value","updatedAt") VALUES ('FREE_STOCK_COLUMN_DELIVERY','delivery',NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "SystemConfig" ("key","value","updatedAt") VALUES ('FREE_STOCK_COLUMN_LAST_MOVEMENT','lastmvmt',NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "SystemConfig" ("key","value","updatedAt") VALUES ('FREE_STOCK_COLUMN_LAST_CHANGER','lastchanger',NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "SystemConfig" ("key","value","updatedAt") VALUES ('FREE_STOCK_RESERVATION_COLUMN_MATERIAL','MATERIAL, Material Code',NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "SystemConfig" ("key","value","updatedAt") VALUES ('FREE_STOCK_RESERVATION_COLUMN_QTY','QTY, Quantity, Req Qty',NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "SystemConfig" ("key","value","updatedAt") VALUES ('FREE_STOCK_RESERVATION_COLUMN_SO_NUMBER','SO NUMBER, SO, SONO',NOW()) ON CONFLICT ("key") DO NOTHING;
INSERT INTO "SystemConfig" ("key","value","updatedAt") SELECT 'CYCLE_COUNT_COLUMN_MATERIAL', COALESCE((SELECT "value" FROM "SystemConfig" WHERE "key"='BOM_AUDIT_COLUMN_MATERIAL'),'materialcode, material, materialno, materialnumber, partno, partnumber'), NOW() ON CONFLICT ("key") DO NOTHING;
INSERT INTO "SystemConfig" ("key","value","updatedAt") SELECT 'CYCLE_COUNT_COLUMN_STORAGE_BIN', COALESCE((SELECT "value" FROM "SystemConfig" WHERE "key"='BOM_AUDIT_COLUMN_STORAGE_BIN'),'storage, storagebin, bin, binno, binnumber'), NOW() ON CONFLICT ("key") DO NOTHING;
INSERT INTO "SystemConfig" ("key","value","updatedAt") SELECT 'CYCLE_COUNT_COLUMN_QTY', COALESCE((SELECT "value" FROM "SystemConfig" WHERE "key"='BOM_AUDIT_COLUMN_QTY'),'stock'), NOW() ON CONFLICT ("key") DO NOTHING;
INSERT INTO "SystemConfig" ("key","value","updatedAt") SELECT 'CYCLE_COUNT_COLUMN_YD', COALESCE((SELECT "value" FROM "SystemConfig" WHERE "key"='BOM_AUDIT_COLUMN_YD'),'certno, certificateno, certificatenumber, yd, ydnumber'), NOW() ON CONFLICT ("key") DO NOTHING;
INSERT INTO "SystemConfig" ("key","value","updatedAt") SELECT 'CYCLE_COUNT_COLUMN_BATCH', COALESCE((SELECT "value" FROM "SystemConfig" WHERE "key"='BOM_AUDIT_COLUMN_BATCH'),'batch, batchno, batchnumber'), NOW() ON CONFLICT ("key") DO NOTHING;
INSERT INTO "SystemConfig" ("key","value","updatedAt") SELECT 'CYCLE_COUNT_COLUMN_OPERATOR', COALESCE((SELECT "value" FROM "SystemConfig" WHERE "key"='BOM_AUDIT_COLUMN_OPERATOR'),'operator, operatorid'), NOW() ON CONFLICT ("key") DO NOTHING;

COMMIT;
