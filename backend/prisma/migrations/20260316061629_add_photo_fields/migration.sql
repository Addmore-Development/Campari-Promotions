/*
  Warnings:

  - You are about to drop the column `idBackUrl` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `idFrontUrl` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "idBackUrl",
DROP COLUMN "idFrontUrl",
ADD COLUMN     "fullBodyPhotoUrl" TEXT,
ADD COLUMN     "headshotUrl" TEXT;
