-- CreateEnum
CREATE TYPE "teacherStatus" AS ENUM ('ODDIY', 'LIDER');

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "status" "teacherStatus" NOT NULL DEFAULT 'ODDIY';
