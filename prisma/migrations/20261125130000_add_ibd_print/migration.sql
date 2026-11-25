CREATE TABLE "IbdPrintUpload" (
    "id" SERIAL NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedById" INTEGER,
    "uploadedByName" TEXT NOT NULL,
    "uploadedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rowCount" INTEGER NOT NULL,
    CONSTRAINT "IbdPrintUpload_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IbdPrintRow" (
    "id" SERIAL NOT NULL,
    "uploadId" INTEGER NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "inboundDelivery" TEXT,
    "materialNumber" TEXT,
    "materialDescription" TEXT,
    "customerName" TEXT,
    "customerM" TEXT,
    "filPurchase" TEXT,
    "fjOaNumber" TEXT,
    "fjInvoice" TEXT,
    "invoiceDate" TEXT,
    "caseNumber" TEXT,
    "filSoNumber" TEXT,
    "weightKg" TEXT,
    CONSTRAINT "IbdPrintRow_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IbdPrintUpload_uploadedAt_id_idx" ON "IbdPrintUpload"("uploadedAt", "id");
CREATE INDEX "IbdPrintUpload_uploadedById_idx" ON "IbdPrintUpload"("uploadedById");
CREATE UNIQUE INDEX "IbdPrintRow_uploadId_rowNumber_key" ON "IbdPrintRow"("uploadId", "rowNumber");

ALTER TABLE "IbdPrintUpload" ADD CONSTRAINT "IbdPrintUpload_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "IbdPrintRow" ADD CONSTRAINT "IbdPrintRow_uploadId_fkey"
    FOREIGN KEY ("uploadId") REFERENCES "IbdPrintUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Comma-separated header aliases in priority order, matching the Audit upload convention.
INSERT INTO "SystemConfig" ("key", "value", "updatedAt") VALUES
    ('IBD_PRINT_COLUMN_INBOUND_DELIVERY', 'Inbound De, Inbound Delivery', NOW()),
    ('IBD_PRINT_COLUMN_MATERIAL_NUMBER', 'Material N, Material Number, Material No', NOW()),
    ('IBD_PRINT_COLUMN_MATERIAL_DESCRIPTION', 'Material D, Material Description', NOW()),
    ('IBD_PRINT_COLUMN_CUSTOMER_NAME', 'Customer Name', NOW()),
    ('IBD_PRINT_COLUMN_CUSTOMER_M', 'Customer M', NOW()),
    ('IBD_PRINT_COLUMN_FIL_PURCHASE', 'FIL Purcha, FIL Purchase', NOW()),
    ('IBD_PRINT_COLUMN_FJ_OA_NUMBER', 'FJ OA Numb, FJ OA Number', NOW()),
    ('IBD_PRINT_COLUMN_FJ_INVOICE', 'FJ Invoice', NOW()),
    ('IBD_PRINT_COLUMN_INVOICE_DATE', 'Invoice Da, Invoice Date', NOW()),
    ('IBD_PRINT_COLUMN_CASE_NUMBER', 'Case Numbe, Case Number', NOW()),
    ('IBD_PRINT_COLUMN_FIL_SO_NUMBER', 'FIL SO Num, FIL SO Number', NOW()),
    ('IBD_PRINT_COLUMN_WEIGHT_KG', 'WEIGHT (Kg', NOW())
ON CONFLICT ("key") DO NOTHING;
