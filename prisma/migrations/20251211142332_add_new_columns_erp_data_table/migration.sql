-- AlterTable
ALTER TABLE "ERP_Material_Data" ADD COLUMN     "Accept_Bulk_Data" BOOLEAN,
ADD COLUMN     "Classification" VARCHAR(100),
ADD COLUMN     "Group" VARCHAR(100),
ADD COLUMN     "Mapping_Barcode" VARCHAR(100),
ADD COLUMN     "Remarks_Required" BOOLEAN;

-- AlterTable
ALTER TABLE "ERP_Material_DataArchive" ADD COLUMN     "Accept_Bulk_Data" BOOLEAN,
ADD COLUMN     "Classification" VARCHAR(100),
ADD COLUMN     "Group" VARCHAR(100),
ADD COLUMN     "Mapping_Barcode" VARCHAR(100),
ADD COLUMN     "Remarks_Required" BOOLEAN;
