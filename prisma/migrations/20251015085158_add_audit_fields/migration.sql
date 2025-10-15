-- AlterTable
ALTER TABLE "public"."Dispatch" ADD COLUMN     "UpdatedBy" TEXT,
ADD COLUMN     "UpdatedDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."ERP_Material_File" ADD COLUMN     "UpdatedBy" TEXT,
ADD COLUMN     "UpdatedDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."SalesOrder" ADD COLUMN     "UpdatedBy" TEXT,
ADD COLUMN     "UpdatedDate" TIMESTAMP(3);
