/*
  Warnings:

  - You are about to drop the column `aksiya` on the `Student` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Student" DROP COLUMN "aksiya",
ADD COLUMN     "promotion" BOOLEAN;
