/*
  Warnings:

  - You are about to drop the column `Status` on the `ERP_Material_Data` table. All the data in the column will be lost.
  - You are about to drop the column `Status` on the `ERP_Material_DataArchive` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ERP_Material_Data" DROP COLUMN "Status",
ADD COLUMN     "Remarks" VARCHAR(500);

-- AlterTable
ALTER TABLE "ERP_Material_DataArchive" DROP COLUMN "Status",
ADD COLUMN     "Remarks" VARCHAR(500);
