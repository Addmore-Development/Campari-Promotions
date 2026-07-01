-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "streetName" TEXT,
ADD COLUMN     "streetNumber" TEXT,
ADD COLUMN     "suburb" TEXT,
ADD COLUMN     "termsAndConditions" TEXT;

-- AlterTable
ALTER TABLE "shifts" ADD COLUMN     "checkInLat" DOUBLE PRECISION,
ADD COLUMN     "checkInLng" DOUBLE PRECISION,
ADD COLUMN     "checkOutLat" DOUBLE PRECISION,
ADD COLUMN     "checkOutLng" DOUBLE PRECISION,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "hoursWorked" DOUBLE PRECISION,
ADD COLUMN     "issueReport" TEXT,
ADD COLUMN     "liveLat" DOUBLE PRECISION,
ADD COLUMN     "liveLng" DOUBLE PRECISION,
ADD COLUMN     "liveUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "paymentStatus" TEXT,
ADD COLUMN     "selfieInUrl" TEXT,
ADD COLUMN     "selfieOutUrl" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "streetName" TEXT,
ADD COLUMN     "streetNumber" TEXT,
ADD COLUMN     "suburb" TEXT;
