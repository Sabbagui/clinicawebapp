-- CreateEnum
CREATE TYPE "PrescriptionType" AS ENUM ('SIMPLES', 'CONTROLE_ESPECIAL_C1');

-- AlterTable: add doctor profile fields to users
ALTER TABLE "users"
  ADD COLUMN "crm"           TEXT,
  ADD COLUMN "crmUf"         TEXT,
  ADD COLUMN "clinicName"    TEXT,
  ADD COLUMN "clinicAddress" TEXT,
  ADD COLUMN "clinicPhone"   TEXT;

-- CreateTable: doctor_certificates
CREATE TABLE "doctor_certificates" (
    "id"          TEXT NOT NULL,
    "doctorId"    TEXT NOT NULL,
    "storedPath"  TEXT NOT NULL,
    "iv"          TEXT NOT NULL,
    "authTag"     TEXT NOT NULL,
    "encPassword" TEXT NOT NULL,
    "subjectCN"   TEXT,
    "issuerCN"    TEXT,
    "notBefore"   TIMESTAMP(3),
    "notAfter"    TIMESTAMP(3),
    "uploadedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: issued_prescriptions
CREATE TABLE "issued_prescriptions" (
    "id"              TEXT NOT NULL,
    "medicalRecordId" TEXT NOT NULL,
    "doctorId"        TEXT NOT NULL,
    "patientId"       TEXT NOT NULL,
    "type"            "PrescriptionType" NOT NULL,
    "pdfPath"         TEXT NOT NULL,
    "authHash"        TEXT NOT NULL,
    "isSigned"        BOOLEAN NOT NULL DEFAULT false,
    "issuedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt"       TIMESTAMP(3),

    CONSTRAINT "issued_prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "doctor_certificates_doctorId_key" ON "doctor_certificates"("doctorId");

-- CreateIndex
CREATE INDEX "issued_prescriptions_medicalRecordId_idx" ON "issued_prescriptions"("medicalRecordId");

-- CreateIndex
CREATE INDEX "issued_prescriptions_doctorId_issuedAt_idx" ON "issued_prescriptions"("doctorId", "issuedAt");

-- AddForeignKey
ALTER TABLE "doctor_certificates"
  ADD CONSTRAINT "doctor_certificates_doctorId_fkey"
  FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issued_prescriptions"
  ADD CONSTRAINT "issued_prescriptions_medicalRecordId_fkey"
  FOREIGN KEY ("medicalRecordId") REFERENCES "medical_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issued_prescriptions"
  ADD CONSTRAINT "issued_prescriptions_doctorId_fkey"
  FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issued_prescriptions"
  ADD CONSTRAINT "issued_prescriptions_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
