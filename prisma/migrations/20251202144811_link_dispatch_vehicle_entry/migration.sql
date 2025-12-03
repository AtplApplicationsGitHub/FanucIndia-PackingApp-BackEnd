-- AlterTable
ALTER TABLE "Dispatch" ADD COLUMN     "vehicleEntryId" INTEGER;

-- AddForeignKey
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_vehicleEntryId_fkey" FOREIGN KEY ("vehicleEntryId") REFERENCES "VehicleEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
