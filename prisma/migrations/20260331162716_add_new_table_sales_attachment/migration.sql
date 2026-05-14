-- CreateTable
CREATE TABLE "SalesOrderAttachment" (
    "id" SERIAL NOT NULL,
    "salesOrderId" INTEGER NOT NULL,
    "saleOrderNumber" VARCHAR(500) NOT NULL,
    "outboundDelivery" VARCHAR(500) NOT NULL,
    "fileName" VARCHAR(500) NOT NULL,
    "sftpPath" VARCHAR(1000) NOT NULL,
    "mimeType" VARCHAR(255),
    "fileSizeBytes" INTEGER NOT NULL,
    "uploadedBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesOrderAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesOrderAttachment_salesOrderId_idx" ON "SalesOrderAttachment"("salesOrderId");

-- AddForeignKey
ALTER TABLE "SalesOrderAttachment" ADD CONSTRAINT "SalesOrderAttachment_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderAttachment" ADD CONSTRAINT "SalesOrderAttachment_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
