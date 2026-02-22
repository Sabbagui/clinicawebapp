import { UserRole } from '@prisma/client';

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function removeClinicalNotes<T>(value: T): T {
  if (!isObject(value)) {
    return value;
  }

  const { notes, operationalNotes, ...rest } = value as Record<string, unknown>;
  void notes;
  void operationalNotes;
  return rest as T;
}

function redactAppointmentRow(row: unknown): unknown {
  if (!isObject(row)) {
    return row;
  }

  const { medicalRecord, notes, ...rest } = row;
  void medicalRecord;
  void notes;

  return rest;
}

export function redactAppointmentsDayResponseForReceptionist<T>(payload: T): T {
  if (!isObject(payload)) {
    return payload;
  }

  const rows = Array.isArray(payload.rows) ? payload.rows.map(redactAppointmentRow) : payload.rows;
  return {
    ...payload,
    rows,
  } as T;
}

export function redactAppointmentDetailForReceptionist<T>(payload: T): T {
  return removeClinicalNotes(payload);
}

export function redactPatientDetailForReceptionist<T>(payload: T): T {
  if (!isObject(payload)) {
    return payload;
  }

  const { medicalRecords, appointments, ...rest } = payload as Record<string, unknown>;
  void medicalRecords;

  const safeAppointments = Array.isArray(appointments)
    ? appointments.map((item) => removeClinicalNotes(item))
    : appointments;

  return {
    ...rest,
    appointments: safeAppointments,
  } as T;
}

export function redactPatientHistoryForReceptionist<T>(payload: T): T {
  if (!isObject(payload)) {
    return payload;
  }

  const timeline = Array.isArray(payload.timeline)
    ? payload.timeline.map((entry) => {
        if (!isObject(entry)) {
          return entry;
        }
        const { medicalRecord, notes, ...rest } = entry;
        void medicalRecord;
        void notes;
        return {
          ...rest,
          medicalRecord: null,
        };
      })
    : payload.timeline;

  return {
    ...payload,
    timeline,
  } as T;
}

export function maybeRedactForReceptionist<T>(
  role: UserRole,
  payload: T,
  redactor: (value: T) => T,
): T {
  if (role !== UserRole.RECEPTIONIST) {
    return payload;
  }
  return redactor(payload);
}
