-- CreateTable
CREATE TABLE "public"."SalesOrderArchive" (
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
    "status" TEXT NOT NULL,
    "priority" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesOrderArchive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ERP_Material_DataArchive" (
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
CREATE TABLE "public"."ERP_Material_FileArchive" (
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
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ERP_Material_FileArchive_pkey" PRIMARY KEY ("ID")
);

-- CreateTable
CREATE TABLE "public"."DispatchArchive" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "transporterId" INTEGER,
    "vehicleNumber" TEXT NOT NULL,
    "attachments" JSONB,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DispatchArchive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Dispatch_SOArchive" (
    "id" SERIAL NOT NULL,
    "dispatchId" INTEGER NOT NULL,
    "saleOrderNumber" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dispatch_SOArchive_pkey" PRIMARY KEY ("id")
);
