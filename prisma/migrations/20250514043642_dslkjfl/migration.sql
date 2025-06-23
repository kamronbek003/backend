/*
  Warnings:

  - You are about to drop the `StudentGroup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TeacherSalary` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "StudentGroup" DROP CONSTRAINT "StudentGroup_groupId_fkey";

-- DropForeignKey
ALTER TABLE "StudentGroup" DROP CONSTRAINT "StudentGroup_studentId_fkey";

-- DropForeignKey
ALTER TABLE "TeacherSalary" DROP CONSTRAINT "TeacherSalary_teacherId_fkey";

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "groupId" TEXT;

-- DropTable
DROP TABLE "StudentGroup";

-- DropTable
DROP TABLE "TeacherSalary";

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
