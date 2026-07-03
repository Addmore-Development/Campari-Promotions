-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPERVISOR';

-- AlterTable: jobs.supervisorId
ALTER TABLE "jobs" ADD COLUMN "supervisorId" TEXT;

-- AddForeignKey: jobs.supervisorId -> users.id
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: shifts.lateMinutes (drives automatic late-arrival payment deduction)
ALTER TABLE "shifts" ADD COLUMN "lateMinutes" INTEGER NOT NULL DEFAULT 0;
