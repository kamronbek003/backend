-- CreateEnum
CREATE TYPE "adminStatus" AS ENUM ('ADMIN', 'SUPERADMIN');

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "status" "adminStatus" DEFAULT 'ADMIN';
