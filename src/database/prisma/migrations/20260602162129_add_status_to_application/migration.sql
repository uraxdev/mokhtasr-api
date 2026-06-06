-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'REJECTED', 'EXPIRED', 'ACCEPTED');

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING';
