-- Free Stock reservation prerequisite. Additive migration: no existing tables/data are removed.

BEGIN;

CREATE TYPE "FreeStockStatus" AS ENUM ('OPEN', 'RESERVED', 'CLOSED');

CREATE TYPE "FreeStockUploadStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "FreeStockUpload" (
    "id" SERIAL NOT NULL,
    "fileName" VARCHAR(500) NOT NULL,
    "uploadedById" INTEGER NOT NULL,
    "uploadedByName" VARCHAR(255) NOT NULL,
    "status" "FreeStockUploadStatus" NOT NULL DEFAULT 'PROCESSING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "insertedRows" INTEGER NOT NULL DEFAULT 0,
    "updatedRows" INTEGER NOT NULL DEFAULT 0,
    "closedRows" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),
    CONSTRAINT "FreeStockUpload_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FreeStockItem" (
    "id" SERIAL NOT NULL,
    "storageType" VARCHAR(100),
    "storageBin" VARCHAR(100),
    "materialCode" VARCHAR(100) NOT NULL,
    "plant" VARCHAR(100),
    "storageLocation" VARCHAR(100),
    "availableQty" DECIMAL(18,3),
    "batch" VARCHAR(100) NOT NULL,
    "stockQty" DECIMAL(18,3) NOT NULL,
    "certificateNo" VARCHAR(255),
    "grDate" DATE,
    "grNumber" VARCHAR(100),
    "delivery" VARCHAR(255),
    "lastMovementDate" DATE,
    "lastChanger" VARCHAR(255),
    "status" "FreeStockStatus" NOT NULL DEFAULT 'OPEN',
    "lastSeenUploadId" INTEGER NOT NULL,
    "closedByUploadId" INTEGER,
    "closedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "FreeStockItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FreeStockReservation" (
    "id" SERIAL NOT NULL,
    "bulkReservationId" VARCHAR(36) NOT NULL,
    "stockItemId" INTEGER NOT NULL,
    "reservedQty" DECIMAL(18,3) NOT NULL,
    "soNumber" VARCHAR(100),
    "reservedById" INTEGER NOT NULL,
    "reservedByName" VARCHAR(255) NOT NULL,
    "reservedZoneId" INTEGER,
    "reservedZoneName" VARCHAR(255) NOT NULL,
    "reservedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceFileName" VARCHAR(500),
    "releasedAt" TIMESTAMPTZ(3),
    "releasedById" INTEGER,
    "releasedByName" VARCHAR(255),
    "closedAt" TIMESTAMPTZ(3),
    CONSTRAINT "FreeStockReservation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FreeStockUpload_createdAt_idx" ON "FreeStockUpload"("createdAt");

CREATE INDEX "FreeStockUpload_status_idx" ON "FreeStockUpload"("status");

CREATE INDEX "FreeStockItem_materialCode_batch_idx" ON "FreeStockItem"("materialCode", "batch");

CREATE INDEX "FreeStockItem_status_id_idx" ON "FreeStockItem"("status", "id");

CREATE INDEX "FreeStockItem_lastSeenUploadId_idx" ON "FreeStockItem"("lastSeenUploadId");

CREATE INDEX "FreeStockItem_closedByUploadId_idx" ON "FreeStockItem"("closedByUploadId");

CREATE INDEX "FreeStockReservation_stockItemId_reservedAt_idx" ON "FreeStockReservation"("stockItemId", "reservedAt");

CREATE INDEX "FreeStockReservation_reservedById_releasedAt_closedAt_idx" ON "FreeStockReservation"("reservedById", "releasedAt", "closedAt");

CREATE INDEX "FreeStockReservation_bulkReservationId_idx" ON "FreeStockReservation"("bulkReservationId");

ALTER TABLE "FreeStockUpload" ADD CONSTRAINT "FreeStockUpload_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FreeStockItem" ADD CONSTRAINT "FreeStockItem_lastSeenUploadId_fkey" FOREIGN KEY ("lastSeenUploadId") REFERENCES "FreeStockUpload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FreeStockItem" ADD CONSTRAINT "FreeStockItem_closedByUploadId_fkey" FOREIGN KEY ("closedByUploadId") REFERENCES "FreeStockUpload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FreeStockReservation" ADD CONSTRAINT "FreeStockReservation_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "FreeStockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FreeStockReservation" ADD CONSTRAINT "FreeStockReservation_reservedById_fkey" FOREIGN KEY ("reservedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FreeStockReservation" ADD CONSTRAINT "FreeStockReservation_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One reservable occurrence per Material + Batch, regardless of zone, plant or bin.
CREATE UNIQUE INDEX "FreeStockItem_live_material_batch_key"
ON "FreeStockItem"("materialCode", "batch") WHERE "status" <> 'CLOSED';

-- Protect against two concurrent bookings of the same entire stock row.
CREATE UNIQUE INDEX "FreeStockReservation_active_item_key"
ON "FreeStockReservation"("stockItemId") WHERE "releasedAt" IS NULL AND "closedAt" IS NULL;

ALTER TABLE "FreeStockReservation" ADD CONSTRAINT "FreeStockReservation_qty_positive"
CHECK ("reservedQty" > 0);
ALTER TABLE "FreeStockReservation" ADD CONSTRAINT "FreeStockReservation_end_state"
CHECK (NOT ("releasedAt" IS NOT NULL AND "closedAt" IS NOT NULL));
ALTER TABLE "FreeStockReservation" ADD CONSTRAINT "FreeStockReservation_release_metadata"
CHECK (("releasedAt" IS NULL AND "releasedById" IS NULL AND "releasedByName" IS NULL)
    OR ("releasedAt" IS NOT NULL AND "releasedById" IS NOT NULL AND "releasedByName" IS NOT NULL));
ALTER TABLE "FreeStockItem" ADD CONSTRAINT "FreeStockItem_closed_metadata"
CHECK (("status" = 'CLOSED' AND "closedAt" IS NOT NULL AND "closedByUploadId" IS NOT NULL)
    OR ("status" <> 'CLOSED' AND "closedAt" IS NULL AND "closedByUploadId" IS NULL));

COMMIT;
