-- CreateEnum
CREATE TYPE "VisitType" AS ENUM ('INSPECTION', 'WORK');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED');

-- AlterEnum
ALTER TYPE "ProposalStatus" ADD VALUE 'INSPECTION_COMPLETED';

-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_offer_id_fkey";

-- DropForeignKey
ALTER TABLE "offers" DROP CONSTRAINT "offers_handyman_id_fkey";

-- DropForeignKey
ALTER TABLE "offers" DROP CONSTRAINT "offers_proposal_id_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_offer_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_offer_id_fkey";

-- DropIndex
DROP INDEX "reviews_offer_id_key";

-- DropIndex
DROP INDEX "transactions_offer_id_key";

-- AlterTable
ALTER TABLE "chat_messages" DROP COLUMN "offer_id",
ADD COLUMN     "visit_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "reviews" DROP COLUMN "offer_id",
ADD COLUMN     "visit_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "offer_id",
ADD COLUMN     "visit_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "offers";

-- DropEnum
DROP TYPE "OfferStatus";

-- CreateTable
CREATE TABLE "visits" (
    "id" TEXT NOT NULL,
    "type" "VisitType" NOT NULL,
    "price" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "status" "VisitStatus" NOT NULL DEFAULT 'PENDING',
    "completion_code" TEXT NOT NULL,
    "message" TEXT,
    "estimated_duration" TEXT,
    "scheduled_for" TIMESTAMP(3),
    "stage" "JobStage",
    "proposal_id" TEXT NOT NULL,
    "handyman_id" TEXT NOT NULL,
    "converted_from_visit_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "visits_converted_from_visit_id_key" ON "visits"("converted_from_visit_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_visit_id_key" ON "reviews"("visit_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_visit_id_key" ON "transactions"("visit_id");

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_handyman_id_fkey" FOREIGN KEY ("handyman_id") REFERENCES "handymen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_converted_from_visit_id_fkey" FOREIGN KEY ("converted_from_visit_id") REFERENCES "visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

