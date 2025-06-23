/*
  Warnings:

  - You are about to drop the column `needPayment` on the `Student` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Student" DROP COLUMN "needPayment",
ADD COLUMN     "balance" INTEGER;
