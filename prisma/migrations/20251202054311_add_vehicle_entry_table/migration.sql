-- CreateTable
CREATE TABLE "VehicleEntry" (
    "id" SERIAL NOT NULL,
    "customerName" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "transporterName" TEXT NOT NULL,
    "driverNumber" TEXT NOT NULL,
    "attachments" JSONB,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleEntry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VehicleEntry" ADD CONSTRAINT "VehicleEntry_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
