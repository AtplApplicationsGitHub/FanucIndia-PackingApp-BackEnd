-- AlterTable
ALTER TABLE "BomAudit" ADD COLUMN     "uploadBatchId" VARCHAR(36);

-- CreateIndex
CREATE INDEX "BomAudit_uploadBatchId_idx" ON "BomAudit"("uploadBatchId");
