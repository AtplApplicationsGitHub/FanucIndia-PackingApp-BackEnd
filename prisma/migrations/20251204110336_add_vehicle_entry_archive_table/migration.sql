-- AlterTable
ALTER TABLE "DispatchArchive" ADD COLUMN     "vehicleEntryId" INTEGER;

-- CreateTable
CREATE TABLE "VehicleEntryArchive" (
    "id" INTEGER NOT NULL,
    "customerName" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "transporterName" TEXT NOT NULL,
    "driverNumber" TEXT NOT NULL,
    "attachments" JSONB,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleEntryArchive_pkey" PRIMARY KEY ("id")
);
