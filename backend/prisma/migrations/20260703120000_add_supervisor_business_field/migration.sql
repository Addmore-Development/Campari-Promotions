-- Add supervisor work-field + business association
ALTER TABLE "users" ADD COLUMN "workField" TEXT;
ALTER TABLE "users" ADD COLUMN "businessId" TEXT;

ALTER TABLE "users" ADD CONSTRAINT "users_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
