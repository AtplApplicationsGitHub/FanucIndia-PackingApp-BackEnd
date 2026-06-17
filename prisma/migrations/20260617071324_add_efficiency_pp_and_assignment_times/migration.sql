-- AlterTable
ALTER TABLE "SalesOrder" ADD COLUMN     "IA_Time" TIMESTAMPTZ(3),
ADD COLUMN     "PA_Time" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "Efficiency_PP" (
    "id" SERIAL NOT NULL,
    "salesOrderId" INTEGER NOT NULL,
    "saleOrderNumber" VARCHAR(500) NOT NULL,
    "outboundDelivery" VARCHAR(500) NOT NULL,
    "requiredDate" DATE NOT NULL,
    "userId" INTEGER NOT NULL,
    "userName" VARCHAR(255) NOT NULL,
    "leadTime" DOUBLE PRECISION NOT NULL,
    "scanTime" DOUBLE PRECISION NOT NULL,
    "bin" VARCHAR(10) NOT NULL,
    "stage" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Efficiency_PP_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Efficiency_PP_salesOrderId_stage_key" ON "Efficiency_PP"("salesOrderId", "stage");

-- AddForeignKey
ALTER TABLE "Efficiency_PP" ADD CONSTRAINT "Efficiency_PP_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
