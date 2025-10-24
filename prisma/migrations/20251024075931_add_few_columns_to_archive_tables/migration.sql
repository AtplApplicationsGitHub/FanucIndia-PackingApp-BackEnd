-- AlterTable
ALTER TABLE "public"."DispatchArchive" ADD COLUMN     "UpdatedBy" TEXT,
ADD COLUMN     "UpdatedDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."ERP_Material_FileArchive" ADD COLUMN     "UpdatedBy" TEXT,
ADD COLUMN     "UpdatedDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."SalesOrderArchive" ADD COLUMN     "UpdatedBy" TEXT,
ADD COLUMN     "UpdatedDate" TIMESTAMP(3);
