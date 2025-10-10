-- AlterTable
ALTER TABLE "public"."DispatchArchive" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "DispatchArchive_id_seq";
