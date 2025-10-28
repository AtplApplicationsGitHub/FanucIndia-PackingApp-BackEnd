-- AlterTable
ALTER TABLE "public"."SalesOrder" ALTER COLUMN "status" DROP NOT NULL,
ALTER COLUMN "status" DROP DEFAULT;
