-- CreateTable
CREATE TABLE "public"."Dispatch" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "transporterId" INTEGER,
    "vehicleNumber" TEXT NOT NULL,
    "attachments" JSONB,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Dispatch_SO" (
    "id" SERIAL NOT NULL,
    "dispatchId" INTEGER NOT NULL,
    "saleOrderNumber" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dispatch_SO_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dispatch_SO_dispatchId_saleOrderNumber_key" ON "public"."Dispatch_SO"("dispatchId", "saleOrderNumber");

-- AddForeignKey
ALTER TABLE "public"."Dispatch" ADD CONSTRAINT "Dispatch_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Dispatch" ADD CONSTRAINT "Dispatch_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "public"."Transporter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Dispatch" ADD CONSTRAINT "Dispatch_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Dispatch_SO" ADD CONSTRAINT "Dispatch_SO_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "public"."Dispatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Dispatch_SO" ADD CONSTRAINT "Dispatch_SO_saleOrderNumber_fkey" FOREIGN KEY ("saleOrderNumber") REFERENCES "public"."SalesOrder"("saleOrderNumber") ON DELETE RESTRICT ON UPDATE CASCADE;
