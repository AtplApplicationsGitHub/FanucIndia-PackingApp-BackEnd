-- DropForeignKey
ALTER TABLE "SalesOrder" DROP CONSTRAINT "SalesOrder_packConfigId_fkey";

-- AlterTable
ALTER TABLE "SalesOrder" ALTER COLUMN "transferOrder" DROP NOT NULL,
ALTER COLUMN "packConfigId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_packConfigId_fkey" FOREIGN KEY ("packConfigId") REFERENCES "PackConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
