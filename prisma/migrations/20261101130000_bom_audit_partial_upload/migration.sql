-- AlterTable
ALTER TABLE "BomAuditLocation" ADD COLUMN     "uploadedAt" TIMESTAMPTZ(3),
ADD COLUMN     "uploadSubmissionId" VARCHAR(64);

-- CreateIndex
CREATE INDEX "BomAuditLocation_auditId_uploadedAt_idx" ON "BomAuditLocation"("auditId", "uploadedAt");

-- Backfill: locations of audits already submitted are uploaded
UPDATE "BomAuditLocation" AS l
SET "uploadedAt" = a."submittedAt",
    "uploadSubmissionId" = a."clientSubmissionId"
FROM "BomAudit" AS a
WHERE l."auditId" = a."id"
  AND a."submittedAt" IS NOT NULL
  AND l."uploadedAt" IS NULL;
