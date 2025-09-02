-- CreateTable
CREATE TABLE "public"."User" (
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
CREATE TABLE "public"."Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Transporter" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Transporter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlantCode" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "PlantCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SalesZone" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "SalesZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PackConfig" (
    "id" SERIAL NOT NULL,
    "configName" TEXT NOT NULL,

    CONSTRAINT "PackConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Customer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Printer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Printer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SalesOrder" (
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
    "fgLocation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'R105',
    "priority" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ERP_Material_Data" (
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
CREATE TABLE "public"."ERP_Material_Log" (
    "id" SERIAL NOT NULL,
    "date_time" TIMESTAMP(3) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "exception/status" VARCHAR(255),
    "SO_NO" VARCHAR(50) NOT NULL,
    "no_of_files_executed" INTEGER NOT NULL,

    CONSTRAINT "ERP_Material_Log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ERP_Material_File" (
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

    CONSTRAINT "PK_ERP_Material_File" PRIMARY KEY ("ID")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_saleOrderNumber_key" ON "public"."SalesOrder"("saleOrderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_outboundDelivery_key" ON "public"."SalesOrder"("outboundDelivery");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_transferOrder_key" ON "public"."SalesOrder"("transferOrder");

-- CreateIndex
CREATE INDEX "ERP_Material_File_saleOrderNumber_fileName_idx" ON "public"."ERP_Material_File"("saleOrderNumber", "fileName");

-- CreateIndex
CREATE UNIQUE INDEX "ERP_Material_File_sftpPath_key" ON "public"."ERP_Material_File"("sftpPath");

-- AddForeignKey
ALTER TABLE "public"."SalesOrder" ADD CONSTRAINT "SalesOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SalesOrder" ADD CONSTRAINT "SalesOrder_packConfigId_fkey" FOREIGN KEY ("packConfigId") REFERENCES "public"."PackConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SalesOrder" ADD CONSTRAINT "SalesOrder_plantCodeId_fkey" FOREIGN KEY ("plantCodeId") REFERENCES "public"."PlantCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SalesOrder" ADD CONSTRAINT "SalesOrder_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "public"."Printer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SalesOrder" ADD CONSTRAINT "SalesOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SalesOrder" ADD CONSTRAINT "SalesOrder_salesZoneId_fkey" FOREIGN KEY ("salesZoneId") REFERENCES "public"."SalesZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SalesOrder" ADD CONSTRAINT "SalesOrder_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "public"."User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."SalesOrder" ADD CONSTRAINT "SalesOrder_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "public"."Transporter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SalesOrder" ADD CONSTRAINT "SalesOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ERP_Material_Data" ADD CONSTRAINT "ERP_Material_Data_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."ERP_Material_Data" ADD CONSTRAINT "ERP_Material_Data_saleOrderNumber_fkey" FOREIGN KEY ("saleOrderNumber") REFERENCES "public"."SalesOrder"("saleOrderNumber") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."ERP_Material_File" ADD CONSTRAINT "ERP_Material_File_saleOrderNumber_fkey" FOREIGN KEY ("saleOrderNumber") REFERENCES "public"."SalesOrder"("saleOrderNumber") ON DELETE NO ACTION ON UPDATE NO ACTION;
