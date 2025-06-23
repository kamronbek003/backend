/*
  Warnings:

  - A unique constraint covering the columns `[whichYear,whichMonth]` on the table `MonthlyStatistics` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `whichYear` to the `MonthlyStatistics` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MonthlyStatistics" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "whichYear" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyStatistics_whichYear_whichMonth_key" ON "MonthlyStatistics"("whichYear", "whichMonth");
