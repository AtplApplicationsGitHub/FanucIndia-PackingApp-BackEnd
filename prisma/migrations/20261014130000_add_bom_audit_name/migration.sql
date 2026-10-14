-- ============================================================
-- Phase 2 - RFID Warehouse Audit: BOM Completeness Audit
-- Adds the required "auditName" column to BomAudit.
-- Audits created before this migration get their auditNo as the name,
-- so the column can be NOT NULL without losing any existing row.
-- ============================================================

-- AlterTable: add as nullable first
ALTER TABLE "BomAudit" ADD COLUMN "auditName" VARCHAR(255);

-- Backfill existing audits
UPDATE "BomAudit" SET "auditName" = "auditNo" WHERE "auditName" IS NULL;

-- Now make it required
ALTER TABLE "BomAudit" ALTER COLUMN "auditName" SET NOT NULL;
