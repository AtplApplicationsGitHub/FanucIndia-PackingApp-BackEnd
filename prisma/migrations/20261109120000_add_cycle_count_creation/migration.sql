BEGIN;

CREATE TABLE "CycleCountAudit" (
    "id" SERIAL NOT NULL,
    "auditNo" VARCHAR(30) NOT NULL,
    "auditName" VARCHAR(255) NOT NULL,
    "fileName" VARCHAR(500) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'ASSIGNED',
    "operatorId" INTEGER NOT NULL,
    "operatorName" VARCHAR(255) NOT NULL,
    "totalLocations" INTEGER NOT NULL,
    "totalMaterials" INTEGER NOT NULL,
    "issueFromDate" DATE NOT NULL,
    "issueToDate" DATE NOT NULL,
    "sourceSoCount" INTEGER NOT NULL,
    "qualifyingSoCount" INTEGER NOT NULL,
    "sourceBinCount" INTEGER NOT NULL,
    "uploadedBinCount" INTEGER NOT NULL,
    "matchedBinCount" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdByName" VARCHAR(255) NOT NULL,
    "uploadBatchId" VARCHAR(36) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CycleCountAudit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CycleCountAuditLocation" (
    "id" SERIAL NOT NULL,
    "auditId" INTEGER NOT NULL,
    "storageBin" VARCHAR(100) NOT NULL,
    "sequenceNo" INTEGER NOT NULL,
    "expectedMaterials" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CycleCountAuditLocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CycleCountAuditMaterial" (
    "id" SERIAL NOT NULL,
    "auditLocationId" INTEGER NOT NULL,
    "auditId" INTEGER NOT NULL,
    "materialCode" VARCHAR(100) NOT NULL,
    "expectedQty" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CycleCountAuditMaterial_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CycleCountAudit_auditNo_key" ON "CycleCountAudit"("auditNo");

CREATE INDEX "CycleCountAudit_status_idx" ON "CycleCountAudit"("status");

CREATE INDEX "CycleCountAudit_operatorId_status_idx" ON "CycleCountAudit"("operatorId", "status");

CREATE INDEX "CycleCountAudit_uploadBatchId_idx" ON "CycleCountAudit"("uploadBatchId");

CREATE INDEX "CycleCountAudit_createdAt_idx" ON "CycleCountAudit"("createdAt");

CREATE UNIQUE INDEX "CycleCountAuditLocation_auditId_storageBin_key" ON "CycleCountAuditLocation"("auditId", "storageBin");

CREATE UNIQUE INDEX "CycleCountAuditLocation_auditId_sequenceNo_key" ON "CycleCountAuditLocation"("auditId", "sequenceNo");

CREATE INDEX "CycleCountAuditMaterial_auditId_idx" ON "CycleCountAuditMaterial"("auditId");

CREATE UNIQUE INDEX "CycleCountAuditMaterial_auditLocationId_materialCode_key" ON "CycleCountAuditMaterial"("auditLocationId", "materialCode");

CREATE INDEX "ERP_Material_Data_IssueUpdatedDate_idx" ON "ERP_Material_Data"("IssueUpdatedDate");

CREATE INDEX "ERP_Material_Data_salesOrderId_idx" ON "ERP_Material_Data"("salesOrderId");

CREATE INDEX "ERP_Material_DataArchive_IssueUpdatedDate_idx" ON "ERP_Material_DataArchive"("IssueUpdatedDate");

CREATE INDEX "ERP_Material_DataArchive_salesOrderId_idx" ON "ERP_Material_DataArchive"("salesOrderId");

ALTER TABLE "CycleCountAudit" ADD CONSTRAINT "CycleCountAudit_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CycleCountAudit" ADD CONSTRAINT "CycleCountAudit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CycleCountAuditLocation" ADD CONSTRAINT "CycleCountAuditLocation_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "CycleCountAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CycleCountAuditMaterial" ADD CONSTRAINT "CycleCountAuditMaterial_auditLocationId_fkey" FOREIGN KEY ("auditLocationId") REFERENCES "CycleCountAuditLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CycleCountAuditMaterial" ADD CONSTRAINT "CycleCountAuditMaterial_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "CycleCountAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
