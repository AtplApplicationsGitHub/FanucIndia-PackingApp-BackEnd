/*
  Warnings:

  - A unique constraint covering the columns `[clientSubmissionId]` on the table `BomAudit` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "BomAudit" ADD COLUMN     "clientSubmissionId" VARCHAR(64),
ADD COLUMN     "completedAt" TIMESTAMPTZ(3),
ADD COLUMN     "downloadedAt" TIMESTAMPTZ(3),
ADD COLUMN     "startedAt" TIMESTAMPTZ(3),
ADD COLUMN     "submittedAt" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "BomAuditLocation" ADD COLUMN     "verifiedAt" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "BomAuditMaterial" ADD COLUMN     "actualQty" INTEGER,
ADD COLUMN     "isUnexpected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastScannedAt" TIMESTAMPTZ(3),
ADD COLUMN     "lineStatus" VARCHAR(20);

-- CreateIndex
CREATE UNIQUE INDEX "BomAudit_clientSubmissionId_key" ON "BomAudit"("clientSubmissionId");
