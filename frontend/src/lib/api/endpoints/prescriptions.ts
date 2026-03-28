import apiClient from '../client';
import type { IssuedPrescription, DoctorCertificateMeta, PrescriptionType } from '@/types';

// ─── Receitas ────────────────────────────────────────────────────────────────

export const issuePrescription = async (payload: {
  medicalRecordId: string;
  type: PrescriptionType;
}): Promise<IssuedPrescription> => {
  const response = await apiClient.post('/api/prescriptions', payload);
  return response.data;
};

export const getPrescriptionsByMedicalRecord = async (
  medicalRecordId: string,
): Promise<IssuedPrescription[]> => {
  const response = await apiClient.get(`/api/prescriptions/medical-record/${medicalRecordId}`);
  return response.data;
};

export const getPrescriptionDownloadUrl = (prescriptionId: string): string => {
  return `/api/prescriptions/${prescriptionId}/download`;
};

// ─── Certificado digital ─────────────────────────────────────────────────────

export const uploadCertificate = async (
  file: File,
  password: string,
): Promise<DoctorCertificateMeta> => {
  const formData = new FormData();
  formData.append('certificate', file);
  formData.append('password', password);
  const response = await apiClient.post('/api/users/me/certificate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getCertificateInfo = async (): Promise<DoctorCertificateMeta | null> => {
  const response = await apiClient.get('/api/users/me/certificate');
  return response.data;
};

export const deleteCertificate = async (): Promise<void> => {
  await apiClient.delete('/api/users/me/certificate');
};
