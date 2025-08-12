/*
  Warnings:

  - Added the required column `fileSizeBytes` to the `ERP_Material_File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sftpDir` to the `ERP_Material_File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sftpPath` to the `ERP_Material_File` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[ERP_Material_File] ADD [checksumSha256] NVARCHAR(64),
[fileSizeBytes] BIGINT NOT NULL,
[mimeType] NVARCHAR(255),
[sftpDir] NVARCHAR(1000) NOT NULL,
[sftpPath] NVARCHAR(1000) NOT NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
