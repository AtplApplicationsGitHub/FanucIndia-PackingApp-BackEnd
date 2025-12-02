-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SALES',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transporter" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Transporter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantCode" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "PlantCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesZone" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "SalesZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackConfig" (
    "id" SERIAL NOT NULL,
    "configName" TEXT NOT NULL,

    CONSTRAINT "PackConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Printer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Printer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrder" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "saleOrderNumber" VARCHAR(500) NOT NULL,
    "outboundDelivery" VARCHAR(500) NOT NULL,
    "transferOrder" VARCHAR(500) NOT NULL,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "transporterId" INTEGER NOT NULL,
    "plantCodeId" INTEGER NOT NULL,
    "paymentClearance" BOOLEAN NOT NULL,
    "salesZoneId" INTEGER NOT NULL,
    "packConfigId" INTEGER NOT NULL,
    "assignedUserId" INTEGER,
    "customerId" INTEGER,
    "printerId" INTEGER,
    "specialRemarks" TEXT,
    "additionalRemarks" TEXT,
    "fgLocation" TEXT,
    "address" VARCHAR(1000),
    "status" TEXT,
    "priority" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "UpdatedBy" TEXT,
    "UpdatedDate" TIMESTAMP(3),

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ERP_Material_Data" (
    "ID" BIGSERIAL NOT NULL,
    "saleOrderNumber" VARCHAR(500),
    "customerId" INTEGER,
    "transferOrder" VARCHAR(500),
    "FG_OBD" VARCHAR(500),
    "Machine_Model" TEXT,
    "CNC_Serial_No" VARCHAR(100),
    "Material_Code" TEXT NOT NULL,
    "Material_Description" TEXT NOT NULL,
    "Batch_No" VARCHAR(100) NOT NULL,
    "SO_Donor_Batch" VARCHAR(100) NOT NULL,
    "Cert_No" VARCHAR(100) NOT NULL,
    "Bin_No" VARCHAR(100) NOT NULL,
    "A_D_F" VARCHAR(100) NOT NULL,
    "Required_Qty" INTEGER NOT NULL,
    "Issue_stage" INTEGER NOT NULL DEFAULT 0,
    "Packing_stage" INTEGER NOT NULL DEFAULT 0,
    "Status" VARCHAR(100),
    "UpdatedDate" TIMESTAMP(3),
    "UpdatedBy" VARCHAR(50),

    CONSTRAINT "PK_ERP_Material_Data" PRIMARY KEY ("ID")
);

-- CreateTable
CREATE TABLE "ERP_Material_Log" (
    "id" SERIAL NOT NULL,
    "date_time" TIMESTAMP(3) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "exception/status" VARCHAR(255),
    "SO_NO" VARCHAR(50) NOT NULL,
    "no_of_files_executed" INTEGER NOT NULL,

    CONSTRAINT "ERP_Material_Log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ERP_Material_File" (
    "ID" SERIAL NOT NULL,
    "saleOrderNumber" VARCHAR(500),
    "fileName" VARCHAR(500) NOT NULL,
    "description" VARCHAR(2000),
    "sftpPath" VARCHAR(1000) NOT NULL,
    "sftpDir" VARCHAR(1000) NOT NULL,
    "fileSizeBytes" BIGINT NOT NULL,
    "mimeType" VARCHAR(255),
    "checksumSha256" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "UpdatedBy" TEXT,
    "UpdatedDate" TIMESTAMP(3),

    CONSTRAINT "PK_ERP_Material_File" PRIMARY KEY ("ID")
);

-- CreateTable
CREATE TABLE "Dispatch" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER,
    "customerName" TEXT,
    "address" TEXT NOT NULL,
    "transporterId" INTEGER,
    "transporterName" TEXT,
    "vehicleNumber" TEXT NOT NULL,
    "attachments" JSONB,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "UpdatedBy" TEXT,
    "UpdatedDate" TIMESTAMP(3),

    CONSTRAINT "Dispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispatch_SO" (
    "id" SERIAL NOT NULL,
    "dispatchId" INTEGER NOT NULL,
    "saleOrderNumber" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dispatch_SO_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrderArchive" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "saleOrderNumber" VARCHAR(500) NOT NULL,
    "outboundDelivery" VARCHAR(500) NOT NULL,
    "transferOrder" VARCHAR(500) NOT NULL,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "transporterId" INTEGER NOT NULL,
    "plantCodeId" INTEGER NOT NULL,
    "paymentClearance" BOOLEAN NOT NULL,
    "salesZoneId" INTEGER NOT NULL,
    "packConfigId" INTEGER NOT NULL,
    "assignedUserId" INTEGER,
    "customerId" INTEGER,
    "printerId" INTEGER,
    "specialRemarks" TEXT,
    "additionalRemarks" TEXT,
    "fgLocation" TEXT,
    "address" TEXT,
    "status" TEXT,
    "priority" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "UpdatedBy" TEXT,
    "UpdatedDate" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesOrderArchive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ERP_Material_DataArchive" (
    "ID" BIGSERIAL NOT NULL,
    "saleOrderNumber" VARCHAR(500),
    "customerId" INTEGER,
    "transferOrder" VARCHAR(500),
    "FG_OBD" VARCHAR(500),
    "Machine_Model" TEXT,
    "CNC_Serial_No" VARCHAR(100),
    "Material_Code" TEXT NOT NULL,
    "Material_Description" TEXT NOT NULL,
    "Batch_No" VARCHAR(100) NOT NULL,
    "SO_Donor_Batch" VARCHAR(100) NOT NULL,
    "Cert_No" VARCHAR(100) NOT NULL,
    "Bin_No" VARCHAR(100) NOT NULL,
    "A_D_F" VARCHAR(100) NOT NULL,
    "Required_Qty" INTEGER NOT NULL,
    "Issue_stage" INTEGER NOT NULL,
    "Packing_stage" INTEGER NOT NULL,
    "Status" VARCHAR(100),
    "UpdatedDate" TIMESTAMP(3),
    "UpdatedBy" VARCHAR(50),
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ERP_Material_DataArchive_pkey" PRIMARY KEY ("ID")
);

-- CreateTable
CREATE TABLE "ERP_Material_FileArchive" (
    "ID" SERIAL NOT NULL,
    "saleOrderNumber" VARCHAR(500),
    "fileName" VARCHAR(500) NOT NULL,
    "description" VARCHAR(2000),
    "sftpPath" VARCHAR(1000) NOT NULL,
    "sftpDir" VARCHAR(1000) NOT NULL,
    "fileSizeBytes" BIGINT NOT NULL,
    "mimeType" VARCHAR(255),
    "checksumSha256" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL,
    "UpdatedBy" TEXT,
    "UpdatedDate" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ERP_Material_FileArchive_pkey" PRIMARY KEY ("ID")
);

-- CreateTable
CREATE TABLE "DispatchArchive" (
    "id" INTEGER NOT NULL,
    "customerId" INTEGER,
    "customerName" TEXT,
    "address" TEXT NOT NULL,
    "transporterId" INTEGER,
    "transporterName" TEXT,
    "vehicleNumber" TEXT NOT NULL,
    "attachments" JSONB,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "UpdatedBy" TEXT,
    "UpdatedDate" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DispatchArchive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispatch_SOArchive" (
    "id" SERIAL NOT NULL,
    "dispatchId" INTEGER NOT NULL,
    "saleOrderNumber" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dispatch_SOArchive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SO_Status_Stepper" (
    "id" SERIAL NOT NULL,
    "salesOrderNumber" VARCHAR(500) NOT NULL,
    "status" TEXT NOT NULL,
    "createdDateTime" TIMESTAMP(3),
    "updatedBy" TEXT,

    CONSTRAINT "SO_Status_Stepper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SO_Status_StepperArchive" (
    "id" SERIAL NOT NULL,
    "salesOrderNumber" VARCHAR(500) NOT NULL,
    "status" TEXT NOT NULL,
    "createdDateTime" TIMESTAMP(3),
    "updatedBy" TEXT,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SO_Status_StepperArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_saleOrderNumber_key" ON "SalesOrder"("saleOrderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_outboundDelivery_key" ON "SalesOrder"("outboundDelivery");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_transferOrder_key" ON "SalesOrder"("transferOrder");

-- CreateIndex
CREATE INDEX "ERP_Material_File_saleOrderNumber_fileName_idx" ON "ERP_Material_File"("saleOrderNumber", "fileName");

-- CreateIndex
CREATE UNIQUE INDEX "ERP_Material_File_sftpPath_key" ON "ERP_Material_File"("sftpPath");

-- CreateIndex
CREATE UNIQUE INDEX "Dispatch_SO_dispatchId_saleOrderNumber_key" ON "Dispatch_SO"("dispatchId", "saleOrderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SO_Status_Stepper_salesOrderNumber_status_key" ON "SO_Status_Stepper"("salesOrderNumber", "status");

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_packConfigId_fkey" FOREIGN KEY ("packConfigId") REFERENCES "PackConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_plantCodeId_fkey" FOREIGN KEY ("plantCodeId") REFERENCES "PlantCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_salesZoneId_fkey" FOREIGN KEY ("salesZoneId") REFERENCES "SalesZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "Transporter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ERP_Material_Data" ADD CONSTRAINT "ERP_Material_Data_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ERP_Material_Data" ADD CONSTRAINT "ERP_Material_Data_saleOrderNumber_fkey" FOREIGN KEY ("saleOrderNumber") REFERENCES "SalesOrder"("saleOrderNumber") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ERP_Material_File" ADD CONSTRAINT "ERP_Material_File_saleOrderNumber_fkey" FOREIGN KEY ("saleOrderNumber") REFERENCES "SalesOrder"("saleOrderNumber") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "Transporter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispatch_SO" ADD CONSTRAINT "Dispatch_SO_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "Dispatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispatch_SO" ADD CONSTRAINT "Dispatch_SO_saleOrderNumber_fkey" FOREIGN KEY ("saleOrderNumber") REFERENCES "SalesOrder"("saleOrderNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SO_Status_Stepper" ADD CONSTRAINT "SO_Status_Stepper_salesOrderNumber_fkey" FOREIGN KEY ("salesOrderNumber") REFERENCES "SalesOrder"("saleOrderNumber") ON DELETE CASCADE ON UPDATE CASCADE;
