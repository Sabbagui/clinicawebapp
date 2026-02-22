-- Exclusion constraint to prevent overlapping appointments per doctor at the database level.
-- This is a safety net on top of the application-level conflict detection.
--
-- Run this AFTER `npx prisma db push`:
--   docker exec -i gynecology-practice-app-postgres-1 psql -U postgres -d gynecology_db < backend/prisma/exclusion-constraint.sql
--
-- Or via psql:
--   psql -U postgres -d gynecology_db -f backend/prisma/exclusion-constraint.sql

-- Required extension for GiST index on scalar types (uuid, etc.)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add a computed tsrange column representing the appointment time window
-- PostgreSQL 12+ supports GENERATED ALWAYS AS ... STORED
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS "timeRange" tsrange
    GENERATED ALWAYS AS (
      tsrange(
        "scheduledDate",
        "scheduledDate" + ("duration" * interval '1 minute')
      )
    ) STORED;

-- Exclusion constraint: no two active appointments for the same doctor can overlap
-- Only applies to non-cancelled, non-no-show appointments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'no_doctor_time_overlap'
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT no_doctor_time_overlap
        EXCLUDE USING gist (
          "doctorId" WITH =,
          "timeRange" WITH &&
        )
        WHERE (status NOT IN ('CANCELLED', 'NO_SHOW'));
  END IF;
END
$$;
