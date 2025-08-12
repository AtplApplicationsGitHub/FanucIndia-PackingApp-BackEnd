BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[ERP_Material_File] (
    [ID] INT NOT NULL IDENTITY(1,1),
    [saleOrderNumber] NVARCHAR(500),
    [fileName] NVARCHAR(500) NOT NULL,
    [description] NVARCHAR(2000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ERP_Material_File_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PK_ERP_Material_File] PRIMARY KEY CLUSTERED ([ID]),
    CONSTRAINT [UQ_ERP_Material_File_SO_FileName] UNIQUE NONCLUSTERED ([saleOrderNumber],[fileName])
);

-- AddForeignKey
ALTER TABLE [dbo].[ERP_Material_File] ADD CONSTRAINT [ERP_Material_File_saleOrderNumber_fkey] FOREIGN KEY ([saleOrderNumber]) REFERENCES [dbo].[SalesOrder]([saleOrderNumber]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
