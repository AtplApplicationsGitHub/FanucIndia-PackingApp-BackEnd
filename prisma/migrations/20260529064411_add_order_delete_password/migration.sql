-- CreateTable
CREATE TABLE "Order_Delete_Password" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "password" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_Delete_Password_pkey" PRIMARY KEY ("id")
);
