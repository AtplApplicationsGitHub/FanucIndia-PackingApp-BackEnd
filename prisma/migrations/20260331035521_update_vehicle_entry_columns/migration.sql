-- AlterTable
ALTER TABLE "VehicleEntry" ADD COLUMN     "driverName" TEXT,
ADD COLUMN     "inTime" TEXT,
ADD COLUMN     "outTime" TEXT,
ALTER COLUMN "customerName" DROP NOT NULL;

-- AlterTable
ALTER TABLE "VehicleEntryArchive" ADD COLUMN     "driverName" TEXT,
ADD COLUMN     "inTime" TEXT,
ADD COLUMN     "outTime" TEXT,
ALTER COLUMN "customerName" DROP NOT NULL;
