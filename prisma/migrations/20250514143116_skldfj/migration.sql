/*
  Warnings:

  - You are about to drop the column `groupId` on the `Student` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SalaryStatus" AS ENUM ('KUTILMOQDA', 'TOLANDI', 'BEKORQILINDI');

-- AlterEnum
ALTER TYPE "AttendanceStatus" ADD VALUE 'SABABLI';

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_groupId_fkey";

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "groupId";

-- CreateTable
CREATE TABLE "Salary" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "forMonth" INTEGER NOT NULL,
    "forYear" INTEGER NOT NULL,
    "notes" TEXT,
    "teacherId" TEXT NOT NULL,
    "issuedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Salary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_StudentsInGroups" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StudentsInGroups_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Salary_id_key" ON "Salary"("id");

-- CreateIndex
CREATE INDEX "Salary_teacherId_idx" ON "Salary"("teacherId");

-- CreateIndex
CREATE INDEX "Salary_issuedByAdminId_idx" ON "Salary"("issuedByAdminId");

-- CreateIndex
CREATE INDEX "Salary_forMonth_forYear_idx" ON "Salary"("forMonth", "forYear");

-- CreateIndex
CREATE INDEX "_StudentsInGroups_B_index" ON "_StudentsInGroups"("B");

-- AddForeignKey
ALTER TABLE "Salary" ADD CONSTRAINT "Salary_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Salary" ADD CONSTRAINT "Salary_issuedByAdminId_fkey" FOREIGN KEY ("issuedByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StudentsInGroups" ADD CONSTRAINT "_StudentsInGroups_A_fkey" FOREIGN KEY ("A") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StudentsInGroups" ADD CONSTRAINT "_StudentsInGroups_B_fkey" FOREIGN KEY ("B") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
