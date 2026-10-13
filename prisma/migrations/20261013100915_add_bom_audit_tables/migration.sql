-- CreateTable
CREATE TABLE "BomAudit" (
    "id" SERIAL NOT NULL,
    "auditNo" VARCHAR(30) NOT NULL,
    "fileName" VARCHAR(500) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'ASSIGNED',
    "operatorId" INTEGER NOT NULL,
    "operatorName" VARCHAR(255) NOT NULL,
    "totalLocations" INTEGER NOT NULL,
    "totalMaterials" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdByName" VARCHAR(255) NOT NULL,
    "cancelledAt" TIMESTAMPTZ(3),
    "cancelledByName" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BomAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BomAuditLocation" (
    "id" SERIAL NOT NULL,
    "auditId" INTEGER NOT NULL,
    "storageBin" VARCHAR(100) NOT NULL,
    "sequenceNo" INTEGER NOT NULL,
    "expectedMaterials" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BomAuditLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BomAuditMaterial" (
    "id" SERIAL NOT NULL,
    "auditLocationId" INTEGER NOT NULL,
    "auditId" INTEGER NOT NULL,
    "materialCode" VARCHAR(100) NOT NULL,
    "expectedQty" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BomAuditMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BomAudit_auditNo_key" ON "BomAudit"("auditNo");

-- CreateIndex
CREATE INDEX "BomAudit_status_idx" ON "BomAudit"("status");

-- CreateIndex
CREATE INDEX "BomAudit_operatorId_status_idx" ON "BomAudit"("operatorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BomAuditLocation_auditId_storageBin_key" ON "BomAuditLocation"("auditId", "storageBin");

-- CreateIndex
CREATE INDEX "BomAuditMaterial_auditId_idx" ON "BomAuditMaterial"("auditId");

-- CreateIndex
CREATE UNIQUE INDEX "BomAuditMaterial_auditLocationId_materialCode_key" ON "BomAuditMaterial"("auditLocationId", "materialCode");

-- AddForeignKey
ALTER TABLE "BomAudit" ADD CONSTRAINT "BomAudit_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomAudit" ADD CONSTRAINT "BomAudit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomAuditLocation" ADD CONSTRAINT "BomAuditLocation_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "BomAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomAuditMaterial" ADD CONSTRAINT "BomAuditMaterial_auditLocationId_fkey" FOREIGN KEY ("auditLocationId") REFERENCES "BomAuditLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomAuditMaterial" ADD CONSTRAINT "BomAuditMaterial_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "BomAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
