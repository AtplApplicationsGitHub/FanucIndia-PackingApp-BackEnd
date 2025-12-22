-- CreateTable
CREATE TABLE "SalesOrderChatMessage" (
    "id" SERIAL NOT NULL,
    "salesOrderId" INTEGER NOT NULL,
    "fromUserId" INTEGER NOT NULL,
    "toUserId" INTEGER NOT NULL,
    "message" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesOrderChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesOrderChatMessage_salesOrderId_createdAt_idx" ON "SalesOrderChatMessage"("salesOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "SalesOrderChatMessage_toUserId_createdAt_idx" ON "SalesOrderChatMessage"("toUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "SalesOrderChatMessage" ADD CONSTRAINT "SalesOrderChatMessage_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderChatMessage" ADD CONSTRAINT "SalesOrderChatMessage_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderChatMessage" ADD CONSTRAINT "SalesOrderChatMessage_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
