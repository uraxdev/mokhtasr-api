/*
  Warnings:

  - You are about to drop the column `issue_description` on the `proposals` table. All the data in the column will be lost.
  - You are about to drop the column `location_address` on the `proposals` table. All the data in the column will be lost.
  - You are about to drop the column `scheduled_date` on the `proposals` table. All the data in the column will be lost.
  - You are about to drop the column `service_type_name` on the `proposals` table. All the data in the column will be lost.
  - Added the required column `address` to the `proposals` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `proposals` table without a default value. This is not possible if the table is not empty.
  - Added the required column `due_date` to the `proposals` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `proposals` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "proposals" DROP COLUMN "issue_description",
DROP COLUMN "location_address",
DROP COLUMN "scheduled_date",
DROP COLUMN "service_type_name",
ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "due_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;
