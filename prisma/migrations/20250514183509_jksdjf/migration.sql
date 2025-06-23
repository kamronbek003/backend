-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "hasFamilyMembers" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "discount" DROP NOT NULL;
