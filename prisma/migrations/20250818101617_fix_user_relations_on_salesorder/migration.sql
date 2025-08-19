/*
  Warnings:

  - You are about to drop the column `terminalId` on the `SalesOrder` table. All the data in the column will be lost.
  - You are about to drop the `Terminal` table. If the table is not empty, all the data it contains will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[SalesOrder] DROP CONSTRAINT [SalesOrder_terminalId_fkey];

-- AlterTable
ALTER TABLE [dbo].[SalesOrder] DROP COLUMN [terminalId];
ALTER TABLE [dbo].[SalesOrder] ADD [assignedUserId] INT;

-- DropTable
DROP TABLE [dbo].[Terminal];

-- AddForeignKey
ALTER TABLE [dbo].[SalesOrder] ADD CONSTRAINT [SalesOrder_assignedUserId_fkey] FOREIGN KEY ([assignedUserId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
