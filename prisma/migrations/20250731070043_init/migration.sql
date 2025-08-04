BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [password] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [User_role_df] DEFAULT 'sales',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[Product] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000),
    CONSTRAINT [Product_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Transporter] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Transporter_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PlantCode] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    CONSTRAINT [PlantCode_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SalesZone] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [SalesZone_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PackConfig] (
    [id] INT NOT NULL IDENTITY(1,1),
    [configName] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [PackConfig_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Terminal] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Terminal_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Customer] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [address] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Customer_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Printer] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Printer_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SalesOrder] (
    [id] INT NOT NULL IDENTITY(1,1),
    [userId] INT NOT NULL,
    [productId] INT NOT NULL,
    [saleOrderNumber] NVARCHAR(500) NOT NULL,
    [outboundDelivery] NVARCHAR(500) NOT NULL,
    [transferOrder] NVARCHAR(500) NOT NULL,
    [deliveryDate] DATETIME2 NOT NULL,
    [transporterId] INT NOT NULL,
    [plantCodeId] INT NOT NULL,
    [paymentClearance] BIT NOT NULL,
    [salesZoneId] INT NOT NULL,
    [packConfigId] INT NOT NULL,
    [terminalId] INT,
    [customerId] INT,
    [printerId] INT,
    [specialRemarks] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [SalesOrder_status_df] DEFAULT 'R105',
    [priority] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [SalesOrder_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [SalesOrder_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [SalesOrder_saleOrderNumber_key] UNIQUE NONCLUSTERED ([saleOrderNumber]),
    CONSTRAINT [SalesOrder_outboundDelivery_key] UNIQUE NONCLUSTERED ([outboundDelivery]),
    CONSTRAINT [SalesOrder_transferOrder_key] UNIQUE NONCLUSTERED ([transferOrder])
);

-- CreateTable
CREATE TABLE [dbo].[ERP_Material_Data] (
    [ID] BIGINT NOT NULL IDENTITY(1,1),
    [saleOrderNumber] NVARCHAR(500),
    [customerId] INT,
    [transferOrder] NVARCHAR(500),
    [FG_OBD] NVARCHAR(500),
    [Machine_Model] NVARCHAR(1000),
    [CNC_Serial_No] NVARCHAR(100),
    [Material_Code] NVARCHAR(1000) NOT NULL,
    [Material_Description] NVARCHAR(1000) NOT NULL,
    [Batch_No] NVARCHAR(100) NOT NULL,
    [SO_Donor_Batch] NVARCHAR(100) NOT NULL,
    [Cert_No] NVARCHAR(100) NOT NULL,
    [Bin_No] NVARCHAR(100) NOT NULL,
    [A_D_F] NVARCHAR(100) NOT NULL,
    [Required_Qty] INT NOT NULL,
    [Issue_stage] INT NOT NULL CONSTRAINT [ERP_Material_Data_Issue_stage_df] DEFAULT 0,
    [Packing_stage] INT NOT NULL CONSTRAINT [ERP_Material_Data_Packing_stage_df] DEFAULT 0,
    [Status] NVARCHAR(100),
    CONSTRAINT [PK_ERP_Material_Data] PRIMARY KEY CLUSTERED ([ID])
);

-- AddForeignKey
ALTER TABLE [dbo].[SalesOrder] ADD CONSTRAINT [SalesOrder_customerId_fkey] FOREIGN KEY ([customerId]) REFERENCES [dbo].[Customer]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[SalesOrder] ADD CONSTRAINT [SalesOrder_packConfigId_fkey] FOREIGN KEY ([packConfigId]) REFERENCES [dbo].[PackConfig]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[SalesOrder] ADD CONSTRAINT [SalesOrder_plantCodeId_fkey] FOREIGN KEY ([plantCodeId]) REFERENCES [dbo].[PlantCode]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[SalesOrder] ADD CONSTRAINT [SalesOrder_printerId_fkey] FOREIGN KEY ([printerId]) REFERENCES [dbo].[Printer]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[SalesOrder] ADD CONSTRAINT [SalesOrder_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[SalesOrder] ADD CONSTRAINT [SalesOrder_salesZoneId_fkey] FOREIGN KEY ([salesZoneId]) REFERENCES [dbo].[SalesZone]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[SalesOrder] ADD CONSTRAINT [SalesOrder_terminalId_fkey] FOREIGN KEY ([terminalId]) REFERENCES [dbo].[Terminal]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[SalesOrder] ADD CONSTRAINT [SalesOrder_transporterId_fkey] FOREIGN KEY ([transporterId]) REFERENCES [dbo].[Transporter]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[SalesOrder] ADD CONSTRAINT [SalesOrder_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ERP_Material_Data] ADD CONSTRAINT [ERP_Material_Data_saleOrderNumber_fkey] FOREIGN KEY ([saleOrderNumber]) REFERENCES [dbo].[SalesOrder]([saleOrderNumber]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ERP_Material_Data] ADD CONSTRAINT [ERP_Material_Data_transferOrder_fkey] FOREIGN KEY ([transferOrder]) REFERENCES [dbo].[SalesOrder]([transferOrder]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ERP_Material_Data] ADD CONSTRAINT [ERP_Material_Data_FG_OBD_fkey] FOREIGN KEY ([FG_OBD]) REFERENCES [dbo].[SalesOrder]([outboundDelivery]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ERP_Material_Data] ADD CONSTRAINT [ERP_Material_Data_customerId_fkey] FOREIGN KEY ([customerId]) REFERENCES [dbo].[Customer]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
