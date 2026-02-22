import { create } from 'zustand';
import type { Appointment } from '@/lib/api/endpoints/appointments';
import type { AppointmentFormData } from '@/lib/validation/appointment-schema';
import {
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  updateAppointmentStatus,
} from '@/lib/api/endpoints/appointments';
import { getApiErrorMessage } from '@/lib/api/error-utils';

interface AppointmentState {
  appointments: Appointment[];
  currentAppointment: Appointment | null;
  isLoading: boolean;
  error: string | null;
  selectedDate: Date;

  fetchAppointments: (startDate: string, endDate: string, doctorId?: string) => Promise<void>;
  fetchAppointment: (id: string) => Promise<void>;
  addAppointment: (data: AppointmentFormData) => Promise<Appointment>;
  editAppointment: (id: string, data: AppointmentFormData) => Promise<Appointment>;
  changeStatus: (id: string, status: string) => Promise<Appointment>;
  setSelectedDate: (date: Date) => void;
  clearError: () => void;
  clearCurrentAppointment: () => void;
}

export const useAppointmentStore = create<AppointmentState>((set) => ({
  appointments: [],
  currentAppointment: null,
  isLoading: false,
  error: null,
  selectedDate: new Date(),

  fetchAppointments: async (startDate, endDate, doctorId?) => {
    set({ isLoading: true, error: null });
    try {
      const appointments = await getAppointments(startDate, endDate, doctorId);
      set({ appointments, isLoading: false });
    } catch (error: any) {
      set({
        error: getApiErrorMessage(error, 'Erro ao carregar agendamentos'),
        isLoading: false,
      });
    }
  },

  fetchAppointment: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const appointment = await getAppointment(id);
      set({ currentAppointment: appointment, isLoading: false });
    } catch (error: any) {
      set({
        error: getApiErrorMessage(error, 'Erro ao carregar agendamento'),
        isLoading: false,
      });
    }
  },

  addAppointment: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newAppointment = await createAppointment(data);
      set((state) => ({
        appointments: [...state.appointments, newAppointment].sort(
          (a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime(),
        ),
        isLoading: false,
      }));
      return newAppointment;
    } catch (error: any) {
      set({
        error: getApiErrorMessage(error, 'Erro ao criar agendamento'),
        isLoading: false,
      });
      throw error;
    }
  },

  editAppointment: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await updateAppointment(id, data);
      set((state) => ({
        appointments: state.appointments.map((a) => (a.id === id ? updated : a)),
        currentAppointment: updated,
        isLoading: false,
      }));
      return updated;
    } catch (error: any) {
      set({
        error: getApiErrorMessage(error, 'Erro ao atualizar agendamento'),
        isLoading: false,
      });
      throw error;
    }
  },

  changeStatus: async (id, status) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await updateAppointmentStatus(id, status);
      set((state) => ({
        appointments: state.appointments.map((a) => (a.id === id ? updated : a)),
        currentAppointment:
          state.currentAppointment?.id === id ? updated : state.currentAppointment,
        isLoading: false,
      }));
      return updated;
    } catch (error: any) {
      set({
        error: getApiErrorMessage(error, 'Erro ao alterar status'),
        isLoading: false,
      });
      throw error;
    }
  },

  setSelectedDate: (date) => set({ selectedDate: date }),
  clearError: () => set({ error: null }),
  clearCurrentAppointment: () => set({ currentAppointment: null }),
}));
