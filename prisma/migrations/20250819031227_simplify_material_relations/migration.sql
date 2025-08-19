BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[ERP_Material_Data] DROP CONSTRAINT [ERP_Material_Data_FG_OBD_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[ERP_Material_Data] DROP CONSTRAINT [ERP_Material_Data_transferOrder_fkey];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
