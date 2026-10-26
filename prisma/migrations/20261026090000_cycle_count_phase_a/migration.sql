-- ============================================================
-- Phase 2 - RFID Warehouse Audit: Cycle Count (Phase A - create audit on the web)
-- Stock upload (SAP LX03) + audits / locations / expected materials.
-- ============================================================

-- CreateTable
CREATE TABLE "CycleCountStockUpload" (
    "id" SERIAL NOT NULL,
    "fileName" VARCHAR(500) NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "validRows" INTEGER NOT NULL,
    "excludedRows" INTEGER NOT NULL,
    "totalLocations" INTEGER NOT NULL,
    "totalPackages" INTEGER NOT NULL,
    "hasCertNoColumn" BOOLEAN NOT NULL DEFAULT false,
    "hasCncColumn" BOOLEAN NOT NULL DEFAULT false,
    "hasClassColumn" BOOLEAN NOT NULL DEFAULT false,
    "uploadedById" INTEGER NOT NULL,
    "uploadedByName" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CycleCountStockUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CycleCountStockRow" (
    "id" SERIAL NOT NULL,
    "uploadId" INTEGER NOT NULL,
    "rowNo" INTEGER NOT NULL,
    "storageBin" VARCHAR(100) NOT NULL,
    "materialCode" VARCHAR(100) NOT NULL,
    "qty" DECIMAL(15,3),
    "certNo" VARCHAR(100),
    "batch" VARCHAR(100),
    "plant" VARCHAR(50),
    "storageLocation" VARCHAR(50),
    "isCnc" BOOLEAN,
    "materialClass" VARCHAR(10),
    "excludeReason" VARCHAR(40),

    CONSTRAINT "CycleCountStockRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CycleCountAudit" (
    "id" SERIAL NOT NULL,
    "auditNo" VARCHAR(30) NOT NULL,
    "auditName" VARCHAR(255) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'ASSIGNED',
    "operatorId" INTEGER NOT NULL,
    "operatorName" VARCHAR(255) NOT NULL,
    "stockUploadId" INTEGER NOT NULL,
    "stockFileName" VARCHAR(500) NOT NULL,
    "movementFrom" DATE NOT NULL,
    "movementTo" DATE NOT NULL,
    "includeArchived" BOOLEAN NOT NULL DEFAULT true,
    "selectionMethod" VARCHAR(20) NOT NULL,
    "cncFilter" VARCHAR(20) NOT NULL,
    "materialClasses" VARCHAR(20),
    "totalLocations" INTEGER NOT NULL,
    "totalLines" INTEGER NOT NULL,
    "uploadBatchId" VARCHAR(36) NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdByName" VARCHAR(255) NOT NULL,
    "cancelledAt" TIMESTAMPTZ(3),
    "cancelledByName" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CycleCountAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CycleCountLocation" (
    "id" SERIAL NOT NULL,
    "auditId" INTEGER NOT NULL,
    "storageBin" VARCHAR(100) NOT NULL,
    "sequenceNo" INTEGER NOT NULL,
    "movementLines" INTEGER NOT NULL DEFAULT 0,
    "movementLevel" VARCHAR(10) NOT NULL,
    "expectedLines" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CycleCountLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CycleCountMaterial" (
    "id" SERIAL NOT NULL,
    "auditId" INTEGER NOT NULL,
    "auditLocationId" INTEGER NOT NULL,
    "materialCode" VARCHAR(100) NOT NULL,
    "certNo" VARCHAR(100),
    "batch" VARCHAR(100),
    "expectedQty" DECIMAL(15,3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CycleCountMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CycleCountStockUpload_createdAt_idx" ON "CycleCountStockUpload"("createdAt");

-- CreateIndex
CREATE INDEX "CycleCountStockRow_uploadId_storageBin_idx" ON "CycleCountStockRow"("uploadId", "storageBin");

-- CreateIndex
CREATE INDEX "CycleCountStockRow_uploadId_excludeReason_idx" ON "CycleCountStockRow"("uploadId", "excludeReason");

-- CreateIndex
CREATE UNIQUE INDEX "CycleCountAudit_auditNo_key" ON "CycleCountAudit"("auditNo");

-- CreateIndex
CREATE INDEX "CycleCountAudit_status_idx" ON "CycleCountAudit"("status");

-- CreateIndex
CREATE INDEX "CycleCountAudit_operatorId_status_idx" ON "CycleCountAudit"("operatorId", "status");

-- CreateIndex
CREATE INDEX "CycleCountAudit_uploadBatchId_idx" ON "CycleCountAudit"("uploadBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "CycleCountLocation_auditId_storageBin_key" ON "CycleCountLocation"("auditId", "storageBin");

-- CreateIndex
CREATE INDEX "CycleCountMaterial_auditId_idx" ON "CycleCountMaterial"("auditId");

-- CreateIndex
CREATE INDEX "CycleCountMaterial_auditLocationId_idx" ON "CycleCountMaterial"("auditLocationId");

-- AddForeignKey
ALTER TABLE "CycleCountStockUpload" ADD CONSTRAINT "CycleCountStockUpload_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleCountStockRow" ADD CONSTRAINT "CycleCountStockRow_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "CycleCountStockUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleCountAudit" ADD CONSTRAINT "CycleCountAudit_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleCountAudit" ADD CONSTRAINT "CycleCountAudit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleCountAudit" ADD CONSTRAINT "CycleCountAudit_stockUploadId_fkey" FOREIGN KEY ("stockUploadId") REFERENCES "CycleCountStockUpload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleCountLocation" ADD CONSTRAINT "CycleCountLocation_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "CycleCountAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleCountMaterial" ADD CONSTRAINT "CycleCountMaterial_auditLocationId_fkey" FOREIGN KEY ("auditLocationId") REFERENCES "CycleCountLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleCountMaterial" ADD CONSTRAINT "CycleCountMaterial_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "CycleCountAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
