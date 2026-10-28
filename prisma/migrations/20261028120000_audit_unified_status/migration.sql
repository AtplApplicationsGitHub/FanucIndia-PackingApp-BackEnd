-- ============================================================
-- Phase 2 - Warehouse Audit: one status list for ALL audit types
--   ASSIGNED -> IN_PROGRESS -> RECONCILIATION_PENDING -> CLOSED
-- DOWNLOADED and CANCELLED no longer exist (download sets IN_PROGRESS, delete is a hard delete).
-- New Audit No format (BOM-10-2026-0001, CC-10-2026-0001) needs no change: auditNo is VARCHAR(30);
-- existing numbers (AUD-BOM-2026-0001 ...) are kept as they are.
-- ============================================================

-- BOM Completeness: map the old statuses to the new ones
UPDATE "BomAudit" SET "status" = 'IN_PROGRESS' WHERE "status" = 'DOWNLOADED';
UPDATE "BomAudit" SET "status" = 'RECONCILIATION_PENDING' WHERE "status" = 'PENDING_RECONCILIATION';

-- Cancelled audits are removed permanently (locations / materials go with them: ON DELETE CASCADE)
DELETE FROM "BomAudit" WHERE "status" = 'CANCELLED';
DELETE FROM "CycleCountAudit" WHERE "status" = 'CANCELLED';

-- Columns of the old soft delete are no longer used
ALTER TABLE "BomAudit" DROP COLUMN "cancelledAt",
DROP COLUMN "cancelledByName";

ALTER TABLE "CycleCountAudit" DROP COLUMN "cancelledAt",
DROP COLUMN "cancelledByName";

-- Audit No counter: last running number per audit type and month (BOM / 10-2026 -> 57).
-- New format BOM-MM-YYYY-NNNN; numbers are never re-used, even after a hard delete.
-- CreateTable
CREATE TABLE "AuditNoSequence" (
    "prefix" VARCHAR(10) NOT NULL,
    "period" VARCHAR(7) NOT NULL,
    "lastNumber" INTEGER NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AuditNoSequence_pkey" PRIMARY KEY ("prefix","period")
);
