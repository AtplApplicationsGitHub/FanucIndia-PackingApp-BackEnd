-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accessContentAccuracy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "accessErpBarcode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "accessLocationAccuracy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "accessPutAway" BOOLEAN NOT NULL DEFAULT false;
