-- AlterEnum
ALTER TYPE "ShiftStatus" ADD VALUE 'COMPLETED';

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "city" TEXT;
