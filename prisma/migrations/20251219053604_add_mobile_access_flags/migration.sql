-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accessLabelPrint" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "accessMaterialDispatch" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "accessMaterialFgTransfer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "accessPickPack" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "accessVehicleEntry" BOOLEAN NOT NULL DEFAULT false;
