BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[ERP_Material_Data] ADD [UpdatedBy] NVARCHAR(50),
[UpdatedDate] DATETIME;

-- CreateTable
CREATE TABLE [dbo].[ERP_Material_Log] (
    [id] INT NOT NULL IDENTITY(1,1),
    [date_time] DATETIME2 NOT NULL,
    [file_name] NVARCHAR(255) NOT NULL,
    [exception/status] NVARCHAR(255),
    [SO_NO] NVARCHAR(50) NOT NULL,
    [no_of_files_executed] INT NOT NULL,
    CONSTRAINT [ERP_Material_Log_pkey] PRIMARY KEY CLUSTERED ([id])
);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
