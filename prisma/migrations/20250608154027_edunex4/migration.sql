/*
  Warnings:

  - The values [BEKORQILINDI] on the enum `SalaryStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `balance` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedSalary` on the `Teacher` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "FindStatus" AS ENUM ('REKLAMA', 'TANISHLAR', 'INSTAGRAM');

-- CreateEnum
CREATE TYPE "NoteStatus" AS ENUM ('YES', 'NO');

-- AlterEnum
BEGIN;
CREATE TYPE "SalaryStatus_new" AS ENUM ('KUTILMOQDA', 'TOLANDI');
ALTER TYPE "SalaryStatus" RENAME TO "SalaryStatus_old";
ALTER TYPE "SalaryStatus_new" RENAME TO "SalaryStatus";
DROP TYPE "SalaryStatus_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Salary" DROP CONSTRAINT "Salary_issuedByAdminId_fkey";

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "isCalled" "NoteStatus" DEFAULT 'NO';

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "balance",
DROP COLUMN "image",
DROP COLUMN "password",
ADD COLUMN     "howFind" "FindStatus",
ADD COLUMN     "whichSchool" TEXT;

-- AlterTable
ALTER TABLE "Teacher" DROP COLUMN "estimatedSalary";
