-- DropForeignKey
ALTER TABLE "public"."Dispatch" DROP CONSTRAINT "Dispatch_customerId_fkey";

-- AlterTable
ALTER TABLE "public"."Dispatch" ADD COLUMN     "customerName" TEXT,
ALTER COLUMN "customerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."DispatchArchive" ADD COLUMN     "customerName" TEXT,
ALTER COLUMN "customerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Dispatch" ADD CONSTRAINT "Dispatch_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
