-- Add prepaid credit balance for BUSINESS accounts, used to fund job postings
ALTER TABLE "users" ADD COLUMN "creditBalance" INTEGER NOT NULL DEFAULT 0;
