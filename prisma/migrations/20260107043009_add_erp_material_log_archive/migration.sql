-- CreateTable
CREATE TABLE "ERP_Material_LogArchive" (
    "id" INTEGER NOT NULL,
    "date_time" TIMESTAMP(3) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "exception/status" VARCHAR(255),
    "SO_NO" VARCHAR(50) NOT NULL,
    "no_of_files_executed" INTEGER NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ERP_Material_LogArchive_pkey" PRIMARY KEY ("id")
);
