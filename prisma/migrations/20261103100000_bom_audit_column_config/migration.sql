-- BOM audit Excel column header names (SystemConfig). Edit the value to change which Excel header is read.
-- Comma-separated list; the first header found in the file is used. Existing keys are never changed.
INSERT INTO "SystemConfig" ("key", "value", "updatedAt") VALUES
    ('BOM_AUDIT_COLUMN_QTY', 'stock', NOW()),
    ('BOM_AUDIT_COLUMN_STORAGE_BIN', 'storage, storagebin, bin, binno, binnumber', NOW()),
    ('BOM_AUDIT_COLUMN_MATERIAL', 'materialcode, material, materialno, materialnumber, partno, partnumber', NOW()),
    ('BOM_AUDIT_COLUMN_OPERATOR', 'operator, operatorid', NOW())
ON CONFLICT ("key") DO NOTHING;
