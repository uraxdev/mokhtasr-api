-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReviewTag" ADD VALUE 'COMMUNICATIVE';
ALTER TYPE "ReviewTag" ADD VALUE 'RESPECTFUL';
ALTER TYPE "ReviewTag" ADD VALUE 'EXPERT_ADVICE';
ALTER TYPE "ReviewTag" ADD VALUE 'EFFICIENT';
ALTER TYPE "ReviewTag" ADD VALUE 'LATE';
ALTER TYPE "ReviewTag" ADD VALUE 'POOR_COMMUNICATION';
ALTER TYPE "ReviewTag" ADD VALUE 'OVERPRICED';
ALTER TYPE "ReviewTag" ADD VALUE 'MESSY_WORKSPACE';
