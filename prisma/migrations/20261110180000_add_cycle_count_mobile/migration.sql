BEGIN;
ALTER TABLE "CycleCountAudit" ADD COLUMN     "clientSubmissionId" VARCHAR(64),
ADD COLUMN     "closedAt" TIMESTAMPTZ(3),
ADD COLUMN     "closedByName" VARCHAR(255),
ADD COLUMN     "completedAt" TIMESTAMPTZ(3),
ADD COLUMN     "downloadedAt" TIMESTAMPTZ(3),
ADD COLUMN     "reportAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reportError" VARCHAR(1000),
ADD COLUMN     "reportGeneratedAt" TIMESTAMPTZ(3),
ADD COLUMN     "reportPath" VARCHAR(500),
ADD COLUMN     "startedAt" TIMESTAMPTZ(3),
ADD COLUMN     "submittedAt" TIMESTAMPTZ(3);

ALTER TABLE "CycleCountAuditLocation" ADD COLUMN     "uploadSubmissionId" VARCHAR(64),
ADD COLUMN     "uploadedAt" TIMESTAMPTZ(3),
ADD COLUMN     "verifiedAt" TIMESTAMPTZ(3);

ALTER TABLE "CycleCountAuditMaterial" ADD COLUMN     "actualQty" INTEGER,
ADD COLUMN     "isUnexpected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastScannedAt" TIMESTAMPTZ(3),
ADD COLUMN     "lineStatus" VARCHAR(20),
ADD COLUMN     "reconDecision" VARCHAR(40),
ADD COLUMN     "reconRemarks" TEXT,
ADD COLUMN     "reconSapAction" VARCHAR(40) NOT NULL DEFAULT 'NONE',
ADD COLUMN     "resolvedAt" TIMESTAMPTZ(3),
ADD COLUMN     "resolvedByName" VARCHAR(255);

CREATE UNIQUE INDEX "CycleCountAudit_clientSubmissionId_key" ON "CycleCountAudit"("clientSubmissionId");

CREATE INDEX "CycleCountAuditLocation_auditId_uploadedAt_idx" ON "CycleCountAuditLocation"("auditId", "uploadedAt");

COMMIT;
