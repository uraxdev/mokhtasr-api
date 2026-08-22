-- AlterEnum
ALTER TYPE "ProposalStatus" ADD VALUE 'EXPIRED';

-- CreateIndex
CREATE INDEX "proposals_status_due_date_idx" ON "proposals"("status", "due_date");
