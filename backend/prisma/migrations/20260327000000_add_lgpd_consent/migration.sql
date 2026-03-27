-- AlterTable
ALTER TABLE "patients" ADD COLUMN "lgpdConsentGiven" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "patients" ADD COLUMN "lgpdConsentDate" TIMESTAMP(3);
ALTER TABLE "patients" ADD COLUMN "lgpdConsentText" TEXT;
