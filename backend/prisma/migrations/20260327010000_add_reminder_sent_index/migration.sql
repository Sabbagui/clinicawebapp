-- CreateIndex
CREATE INDEX "appointments_reminderSent_scheduledDate_idx" ON "appointments"("reminderSent", "scheduledDate");
