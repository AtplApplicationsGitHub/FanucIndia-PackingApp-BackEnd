/*
  Warnings:

  - A unique constraint covering the columns `[sftpPath]` on the table `ERP_Material_File` will be added. If there are existing duplicate values, this will fail.

*/
BEGIN TRY

BEGIN TRAN;

-- DropIndex
ALTER TABLE [dbo].[ERP_Material_File] DROP CONSTRAINT [UQ_ERP_Material_File_SO_FileName];

-- CreateIndex
CREATE NONCLUSTERED INDEX [ERP_Material_File_saleOrderNumber_fileName_idx] ON [dbo].[ERP_Material_File]([saleOrderNumber], [fileName]);

-- CreateIndex
ALTER TABLE [dbo].[ERP_Material_File] ADD CONSTRAINT [ERP_Material_File_sftpPath_key] UNIQUE NONCLUSTERED ([sftpPath]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
