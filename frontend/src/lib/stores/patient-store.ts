import { create } from 'zustand';
import type { Patient } from '@/types';
import type { PatientFormData } from '@/lib/validation/patient-schema';
import {
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
} from '@/lib/api/endpoints/patients';

interface PatientState {
  patients: Patient[];
  currentPatient: Patient | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchPatients: () => Promise<void>;
  fetchPatient: (id: string) => Promise<void>;
  addPatient: (data: PatientFormData) => Promise<Patient>;
  editPatient: (id: string, data: PatientFormData) => Promise<Patient>;
  removePatient: (id: string) => Promise<void>;
  clearError: () => void;
  clearCurrentPatient: () => void;
}

export const usePatientStore = create<PatientState>((set, get) => ({
  patients: [],
  currentPatient: null,
  isLoading: false,
  error: null,

  fetchPatients: async () => {
    set({ isLoading: true, error: null });
    try {
      const patients = await getPatients();
      set({ patients, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || error.message || 'Erro ao carregar pacientes',
        isLoading: false,
      });
    }
  },

  fetchPatient: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const patient = await getPatient(id);
      set({ currentPatient: patient, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || error.message || 'Erro ao carregar paciente',
        isLoading: false,
      });
    }
  },

  addPatient: async (data: PatientFormData) => {
    set({ isLoading: true, error: null });
    try {
      const newPatient = await createPatient(data);

      // Add to list and sort by name
      set((state) => ({
        patients: [...state.patients, newPatient].sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
        isLoading: false,
      }));

      return newPatient;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || error.message || 'Erro ao criar paciente',
        isLoading: false,
      });
      throw error;
    }
  },

  editPatient: async (id: string, data: PatientFormData) => {
    set({ isLoading: true, error: null });
    try {
      const updatedPatient = await updatePatient(id, data);

      // Update in list
      set((state) => ({
        patients: state.patients.map((p) => (p.id === id ? updatedPatient : p)),
        currentPatient: updatedPatient,
        isLoading: false,
      }));

      return updatedPatient;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || error.message || 'Erro ao atualizar paciente',
        isLoading: false,
      });
      throw error;
    }
  },

  removePatient: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await deletePatient(id);

      // Remove from list
      set((state) => ({
        patients: state.patients.filter((p) => p.id !== id),
        currentPatient: state.currentPatient?.id === id ? null : state.currentPatient,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || error.message || 'Erro ao deletar paciente',
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  clearCurrentPatient: () => set({ currentPatient: null }),
}));
