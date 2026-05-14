-- AlterTable
ALTER TABLE "User" ADD COLUMN     "salesZoneId" INTEGER;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_salesZoneId_fkey" FOREIGN KEY ("salesZoneId") REFERENCES "SalesZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
