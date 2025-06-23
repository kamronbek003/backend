/*
  Warnings:

  - The values [REKLAMA,TANISHLAR,INSTAGRAM] on the enum `FindStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "FindStatus_new" AS ENUM ('SOCIAL_MEDIA', 'FRIEND_REFERRAL', 'ADVERTISEMENT', 'OTHER');
ALTER TABLE "Student" ALTER COLUMN "howFind" TYPE "FindStatus_new" USING ("howFind"::text::"FindStatus_new");
ALTER TYPE "FindStatus" RENAME TO "FindStatus_old";
ALTER TYPE "FindStatus_new" RENAME TO "FindStatus";
DROP TYPE "FindStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "whenCome" TIMESTAMP(3);
