/*
  Warnings:

  - The values [OKTABY] on the enum `monthStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `firstPayment` on the `Student` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "monthStatus_new" AS ENUM ('YANVAR', 'FEVRAL', 'MART', 'APREL', 'MAY', 'IYUN', 'IYUL', 'AVGUST', 'SENTABR', 'OKTABR', 'NOYABR', 'DEKABR');
ALTER TABLE "Payment" ALTER COLUMN "whichMonth" TYPE "monthStatus_new" USING ("whichMonth"::text::"monthStatus_new");
ALTER TYPE "monthStatus" RENAME TO "monthStatus_old";
ALTER TYPE "monthStatus_new" RENAME TO "monthStatus";
DROP TYPE "monthStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "firstPayment",
ADD COLUMN     "firstPaymentNote" TEXT;
