-- CreateIndex
CREATE INDEX IF NOT EXISTS "appointments_doctorId_scheduledDate_idx"
ON "appointments"("doctorId", "scheduledDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "appointments_patientId_scheduledDate_idx"
ON "appointments"("patientId", "scheduledDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "appointments_status_scheduledDate_idx"
ON "appointments"("status", "scheduledDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payments_status_idx"
ON "payments"("status");
