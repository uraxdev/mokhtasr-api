-- CreateEnum
CREATE TYPE "ReviewTag" AS ENUM ('PROFESSIONAL', 'PUNCTUAL', 'GOOD_VALUE', 'HIGH_QUALITY_WORK', 'FRIENDLY', 'CLEAN_WORKSPACE');

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "tags" "ReviewTag"[] DEFAULT ARRAY[]::"ReviewTag"[];
