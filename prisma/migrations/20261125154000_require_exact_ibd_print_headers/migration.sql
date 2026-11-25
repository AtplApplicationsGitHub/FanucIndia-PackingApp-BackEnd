-- Convert known default aliases into one exact header per field.
-- Keep custom SystemConfig values, which now represent literal header texts.
UPDATE "SystemConfig" AS config
SET "value" = headers.exact, "updatedAt" = NOW()
FROM (VALUES
    ('IBD_PRINT_COLUMN_INBOUND_DELIVERY', 'Inbound De, Inbound Delivery', 'Inbound   De'),
    ('IBD_PRINT_COLUMN_MATERIAL_NUMBER', 'Material N, Material Number, Material No', 'Material N'),
    ('IBD_PRINT_COLUMN_MATERIAL_DESCRIPTION', 'Material D, Material Description', 'Material D'),
    ('IBD_PRINT_COLUMN_FIL_PURCHASE', 'FIL Purcha, FIL Purchase', 'FIL Purcha'),
    ('IBD_PRINT_COLUMN_FJ_OA_NUMBER', 'FJ OA Numb, FJ OA Number', 'FJ OA Numb'),
    ('IBD_PRINT_COLUMN_INVOICE_DATE', 'Invoice Da, Invoice Date', 'Invoice Da'),
    ('IBD_PRINT_COLUMN_CASE_NUMBER', 'Case Numbe, Case Number', 'Case Numbe'),
    ('IBD_PRINT_COLUMN_FIL_SO_NUMBER', 'FIL SO Num, FIL SO Number', 'FIL SO Num')
) AS headers(key, legacy, exact)
WHERE config."key" = headers.key AND config."value" = headers.legacy;
