-- CreateTable
CREATE TABLE "SoChatNotification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "salesOrderId" INTEGER NOT NULL,
    "messageId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SoChatNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SoChatNotification_userId_createdAt_idx" ON "SoChatNotification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SoChatNotification_userId_messageId_key" ON "SoChatNotification"("userId", "messageId");

-- AddForeignKey
ALTER TABLE "SoChatNotification" ADD CONSTRAINT "SoChatNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoChatNotification" ADD CONSTRAINT "SoChatNotification_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoChatNotification" ADD CONSTRAINT "SoChatNotification_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "SalesOrderChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
