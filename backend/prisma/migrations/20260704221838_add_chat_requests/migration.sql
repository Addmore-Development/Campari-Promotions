-- Instagram-DM-style message request gating for SUPERVISOR -> ADMIN chat.
-- A supervisor's first message creates a pending request; nothing else
-- is delivered until an admin accepts it.
CREATE TABLE "chat_requests" (
    "id" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "respondedBy" TEXT,

    CONSTRAINT "chat_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chat_requests_supervisorId_key" ON "chat_requests"("supervisorId");

ALTER TABLE "chat_requests" ADD CONSTRAINT "chat_requests_supervisorId_fkey"
  FOREIGN KEY ("supervisorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
