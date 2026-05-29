-- CreateTable
CREATE TABLE "ManualFgStorage" (
    "id" SERIAL NOT NULL,
    "salesOrderNumber" VARCHAR(500) NOT NULL,
    "fgLocation" VARCHAR(500) NOT NULL,
    "user" VARCHAR(255) NOT NULL,
    "dateTime" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualFgStorage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManualFgStorage_salesOrderNumber_idx" ON "ManualFgStorage"("salesOrderNumber");
