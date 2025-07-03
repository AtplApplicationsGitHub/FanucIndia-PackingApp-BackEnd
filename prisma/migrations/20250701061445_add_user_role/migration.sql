-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('sales', 'admin');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'sales';
