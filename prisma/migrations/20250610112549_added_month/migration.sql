/*
  Warnings:

  - You are about to drop the column `date` on the `Payment` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "monthStatus" AS ENUM ('YANVAR', 'FEVRAL', 'MART', 'APREL', 'MAY', 'IYUN', 'IYUL', 'AVGUST', 'SENTABR', 'OKTABY', 'NOYABR', 'DEKABR');

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "date",
ADD COLUMN     "whichMonth" "monthStatus",
ADD COLUMN     "whichYear" INTEGER;
