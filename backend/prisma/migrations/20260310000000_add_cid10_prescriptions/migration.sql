-- AlterTable: add cid10 and prescriptions to medical_records
ALTER TABLE "medical_records" ADD COLUMN "cid10" TEXT;
ALTER TABLE "medical_records" ADD COLUMN "prescriptions" JSONB;
