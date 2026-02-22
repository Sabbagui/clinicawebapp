import apiClient from '../client';
import type { Patient, AppointmentStatus } from '@/types';
import type { PatientFormData } from '@/lib/validation/patient-schema';
import { stripFormatting } from '@/lib/utils';

// Patient History types
export interface PatientHistoryStats {
  lastVisitAt: string | null;
  nextAppointmentAt: string | null;
  completedCount: number;
  noShowCount: number;
  cancelledCount: number;
}

export interface TimelineMedicalRecord {
  id: string;
  status: 'DRAFT' | 'FINAL';
  finalizedAt: string | null;
  subjectivePreview: string | null;
  assessmentPreview: string | null;
  planPreview: string | null;
}

export interface TimelinePayment {
  id: string;
  status: string;
  amount: number;
  method: string;
  paidAt: string | null;
}

export interface TimelineEntry {
  appointmentId: string;
  scheduledDate: string;
  duration: number;
  type: string;
  status: string;
  notes: string | null;
  doctor: { id: string; name: string };
  medicalRecord: TimelineMedicalRecord | null;
  payment: TimelinePayment | null;
}

export interface PatientHistoryResponse {
  patient: {
    id: string;
    name: string;
    birthDate: string;
    phone: string;
    email: string | null;
  };
  stats: PatientHistoryStats;
  timeline: TimelineEntry[];
}

// Backend API response structure (flat fields)
interface PatientAPIResponse {
  id: string;
  name: string;
  cpf: string;
  birthDate: string; // ISO string
  phone: string;
  whatsapp?: string;
  email?: string;
  // Flat address fields
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  // Flat emergency contact fields
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  createdAt: string;
  updatedAt: string;
}

// Backend request structure (flat fields, raw format)
interface PatientAPIRequest {
  name: string;
  cpf: string; // Raw format (11 digits, no formatting)
  birthDate: string; // ISO format (YYYY-MM-DD)
  phone: string; // Raw format (11 digits)
  whatsapp?: string;
  email?: string;
  // Flat address
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string; // Raw format (8 digits)
  // Flat emergency contact
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
}

/**
 * Transform API response (flat structure) to Patient type (nested structure)
 * @param api Backend API response with flat fields
 * @returns Patient object with nested address and emergencyContact
 */
function transformAPIToPatient(api: PatientAPIResponse): Patient {
  return {
    id: api.id,
    name: api.name,
    cpf: api.cpf,
    birthDate: new Date(api.birthDate),
    phone: api.phone,
    whatsapp: api.whatsapp,
    email: api.email,
    address: {
      street: api.street,
      number: api.number,
      complement: api.complement,
      neighborhood: api.neighborhood,
      city: api.city,
      state: api.state,
      zipCode: api.zipCode,
    },
    emergencyContact: api.emergencyContactName
      ? {
          name: api.emergencyContactName,
          relationship: api.emergencyContactRelationship!,
          phone: api.emergencyContactPhone!,
        }
      : undefined,
    createdAt: new Date(api.createdAt),
    updatedAt: new Date(api.updatedAt),
  };
}

/**
 * Transform form data (nested structure) to API request (flat structure)
 * Strips formatting from CPF, phone numbers, and ZIP code
 * @param form Patient form data with nested address and emergencyContact
 * @returns Flat API request object with raw field values
 */
function transformFormToAPI(form: PatientFormData): PatientAPIRequest {
  return {
    name: form.name,
    cpf: stripFormatting(form.cpf), // Remove dots and dashes
    birthDate: `${form.birthDate}T12:00:00.000Z`, // noon UTC avoids UTC-3 day rollback
    phone: stripFormatting(form.phone), // Remove parentheses, spaces, dashes
    whatsapp: form.whatsapp ? stripFormatting(form.whatsapp) : undefined,
    email: form.email || undefined, // Convert empty string to undefined
    // Flatten address
    street: form.address.street,
    number: form.address.number,
    complement: form.address.complement || undefined,
    neighborhood: form.address.neighborhood,
    city: form.address.city,
    state: form.address.state.toUpperCase(),
    zipCode: stripFormatting(form.address.zipCode),
    // Flatten emergency contact
    emergencyContactName: form.emergencyContact?.name,
    emergencyContactRelationship: form.emergencyContact?.relationship,
    emergencyContactPhone: form.emergencyContact?.phone
      ? stripFormatting(form.emergencyContact.phone)
      : undefined,
  };
}

/**
 * Get all patients (ordered by name)
 * @returns Array of Patient objects with nested structure
 */
export const getPatients = async (): Promise<Patient[]> => {
  const response = await apiClient.get<PatientAPIResponse[]>('/api/patients');
  return response.data.map(transformAPIToPatient);
};

/**
 * Get single patient by ID (includes appointments and medical records)
 * @param id Patient ID (UUID)
 * @returns Patient object with full details
 */
export const getPatient = async (id: string): Promise<Patient> => {
  const response = await apiClient.get<PatientAPIResponse>(`/api/patients/${id}`);
  return transformAPIToPatient(response.data);
};

/**
 * Create new patient
 * @param data Patient form data with nested structure
 * @returns Created patient object
 */
export const createPatient = async (data: PatientFormData): Promise<Patient> => {
  const payload = transformFormToAPI(data);
  const response = await apiClient.post<PatientAPIResponse>('/api/patients', payload);
  return transformAPIToPatient(response.data);
};

/**
 * Update existing patient (partial update supported)
 * @param id Patient ID (UUID)
 * @param data Patient form data with fields to update
 * @returns Updated patient object
 */
export const updatePatient = async (
  id: string,
  data: PatientFormData
): Promise<Patient> => {
  const payload = transformFormToAPI(data);
  const response = await apiClient.patch<PatientAPIResponse>(
    `/api/patients/${id}`,
    payload
  );
  return transformAPIToPatient(response.data);
};

/**
 * Delete patient
 * @param id Patient ID (UUID)
 */
export const deletePatient = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/patients/${id}`);
};

/**
 * Get patient history timeline
 * @param id Patient ID (UUID)
 * @param options Optional filters (limit, status)
 */
export const getPatientHistory = async (
  id: string,
  options?: { limit?: number; status?: AppointmentStatus },
): Promise<PatientHistoryResponse> => {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.status) params.set('status', options.status);
  const query = params.toString();
  const response = await apiClient.get<PatientHistoryResponse>(
    `/api/patients/${id}/history${query ? `?${query}` : ''}`,
  );
  return response.data;
};
