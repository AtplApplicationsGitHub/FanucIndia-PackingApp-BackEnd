-- CreateTable
CREATE TABLE "CustomerLabelPrint" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "userName" TEXT,

    CONSTRAINT "CustomerLabelPrint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerLabelPrintEntry" (
    "id" SERIAL NOT NULL,
    "customerLabelPrintId" INTEGER NOT NULL,
    "saleOrderNumber" VARCHAR(500) NOT NULL,

    CONSTRAINT "CustomerLabelPrintEntry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CustomerLabelPrint" ADD CONSTRAINT "CustomerLabelPrint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLabelPrintEntry" ADD CONSTRAINT "CustomerLabelPrintEntry_customerLabelPrintId_fkey" FOREIGN KEY ("customerLabelPrintId") REFERENCES "CustomerLabelPrint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
