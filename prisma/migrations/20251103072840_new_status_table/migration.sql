-- CreateTable
CREATE TABLE "public"."SO_Status_Stepper" (
    "id" SERIAL NOT NULL,
    "salesOrderNumber" VARCHAR(500) NOT NULL,
    "status" TEXT NOT NULL,
    "createdDateTime" TIMESTAMP(3),
    "updatedBy" TEXT,

    CONSTRAINT "SO_Status_Stepper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SO_Status_StepperArchive" (
    "id" SERIAL NOT NULL,
    "salesOrderNumber" VARCHAR(500) NOT NULL,
    "status" TEXT NOT NULL,
    "createdDateTime" TIMESTAMP(3),
    "updatedBy" TEXT,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SO_Status_StepperArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SO_Status_Stepper_salesOrderNumber_status_key" ON "public"."SO_Status_Stepper"("salesOrderNumber", "status");

-- AddForeignKey
ALTER TABLE "public"."SO_Status_Stepper" ADD CONSTRAINT "SO_Status_Stepper_salesOrderNumber_fkey" FOREIGN KEY ("salesOrderNumber") REFERENCES "public"."SalesOrder"("saleOrderNumber") ON DELETE CASCADE ON UPDATE CASCADE;
