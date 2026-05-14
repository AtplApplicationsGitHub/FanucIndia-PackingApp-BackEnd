-- CreateTable
CREATE TABLE "ERP_Data_Cron_Logs" (
    "id" SERIAL NOT NULL,
    "saleOrderNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ERP_Data_Cron_Logs_pkey" PRIMARY KEY ("id")
);
