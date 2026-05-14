-- AddForeignKey
ALTER TABLE "SalesOrderArchive" ADD CONSTRAINT "SalesOrderArchive_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderArchive" ADD CONSTRAINT "SalesOrderArchive_salesZoneId_fkey" FOREIGN KEY ("salesZoneId") REFERENCES "SalesZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderArchive" ADD CONSTRAINT "SalesOrderArchive_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
