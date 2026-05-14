-- AlterTable
ALTER TABLE "SalesOrder" ADD COLUMN     "issueAssignedUserId" INTEGER,
ADD COLUMN     "packingAssignedUserId" INTEGER,
ADD COLUMN     "skipIssueStage" BOOLEAN DEFAULT false,
ADD COLUMN     "skipPackingStage" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "SalesOrderArchive" ADD COLUMN     "issueAssignedUserId" INTEGER,
ADD COLUMN     "packingAssignedUserId" INTEGER,
ADD COLUMN     "skipIssueStage" BOOLEAN,
ADD COLUMN     "skipPackingStage" BOOLEAN;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_issueAssignedUserId_fkey" FOREIGN KEY ("issueAssignedUserId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_packingAssignedUserId_fkey" FOREIGN KEY ("packingAssignedUserId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
