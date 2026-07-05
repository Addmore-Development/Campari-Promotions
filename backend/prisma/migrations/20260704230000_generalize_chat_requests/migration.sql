-- Generalize chat_requests from "supervisor -> admin only" to
-- "any of SUPERVISOR / PROMOTER / BUSINESS -> admin", since promoters and
-- businesses now use the same first-message request gating.
ALTER TABLE "chat_requests" RENAME COLUMN "supervisorId" TO "requesterId";
ALTER TABLE "chat_requests" RENAME CONSTRAINT "chat_requests_supervisorId_fkey" TO "chat_requests_requesterId_fkey";
ALTER INDEX "chat_requests_supervisorId_key" RENAME TO "chat_requests_requesterId_key";