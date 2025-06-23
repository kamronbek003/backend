/*
  Warnings:

  - Made the column `date` on table `Payment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "date" SET NOT NULL;
