-- CreateTable
CREATE TABLE "MaterialBarcode" (
    "id" SERIAL NOT NULL,
    "erpCode" TEXT NOT NULL,
    "mappingBarcode" TEXT,
    "group" TEXT,
    "acceptBulkData" BOOLEAN NOT NULL DEFAULT false,
    "remarksRequired" BOOLEAN NOT NULL DEFAULT false,
    "classification" TEXT,

    CONSTRAINT "MaterialBarcode_pkey" PRIMARY KEY ("id")
);
