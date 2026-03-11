import { create } from 'zustand';
import {
  type AppointmentListFilters,
  type AppointmentListItem,
  type AppointmentStatus,
  type AvailableSlot,
  createAppointment as createAppointmentApi,
  getAppointments,
  getAvailableSlots,
  updateAppointmentStatus,
  rescheduleAppointment as rescheduleAppointmentApi,
  type CreateAppointmentDto,
} from '@/lib/api/appointments';
import { getApiErrorMessage } from '@/lib/api/error-utils';

interface AppointmentsStoreState {
  appointments: AppointmentListItem[];
  selectedDate: string;
  selectedDoctorId: string;
  availableSlots: AvailableSlot[];
  isLoading: boolean;
  error: string | null;
  fetchAppointments: (filters?: AppointmentListFilters) => Promise<void>;
  createAppointment: (data: CreateAppointmentDto) => Promise<AppointmentListItem>;
  updateStatus: (
    id: string,
    status: AppointmentStatus,
    cancelReason?: string,
  ) => Promise<AppointmentListItem>;
  fetchAvailableSlots: (doctorId: string, date: string) => Promise<void>;
  reschedule: (id: string, date: string, startTime: string) => Promise<AppointmentListItem>;
  setSelectedDate: (date: string) => void;
  setSelectedDoctor: (doctorId: string) => void;
}

function todayIsoDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const useAppointmentsStore = create<AppointmentsStoreState>((set, get) => ({
  appointments: [],
  selectedDate: todayIsoDate(),
  selectedDoctorId: '',
  availableSlots: [],
  isLoading: false,
  error: null,

  fetchAppointments: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const selectedDate = filters.date ?? get().selectedDate;
      const selectedDoctorId = filters.doctorId ?? get().selectedDoctorId;
      const response = await getAppointments({
        date: selectedDate,
        doctorId: selectedDoctorId || undefined,
        page: 1,
        limit: 100,
        ...filters,
      });
      set({ appointments: response.data, isLoading: false });
    } catch (error) {
      set({
        error: getApiErrorMessage(error, 'Erro ao carregar agendamentos.'),
        isLoading: false,
      });
    }
  },

  createAppointment: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const created = await createAppointmentApi(data);
      set((state) => ({
        appointments: [...state.appointments, created],
        isLoading: false,
      }));
      return created;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Erro ao criar agendamento.');
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  updateStatus: async (id, status, cancelReason) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await updateAppointmentStatus(id, status, cancelReason);
      set((state) => ({
        appointments: state.appointments.map((appointment) =>
          appointment.id === id ? updated : appointment,
        ),
        isLoading: false,
      }));
      return updated;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Erro ao atualizar status.');
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  fetchAvailableSlots: async (doctorId, date) => {
    try {
      const slots = await getAvailableSlots(doctorId, date);
      set({ availableSlots: slots });
    } catch (error) {
      set({
        error: getApiErrorMessage(error, 'Erro ao carregar horários disponíveis.'),
      });
    }
  },

  reschedule: async (id, date, startTime) => {
    try {
      const updated = await rescheduleAppointmentApi(id, date, startTime);
      set((state) => ({
        appointments: state.appointments.map((a) => (a.id === id ? updated : a)),
      }));
      return updated;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Erro ao reagendar consulta.');
      throw new Error(message);
    }
  },

  setSelectedDate: (date) => set({ selectedDate: date }),
  setSelectedDoctor: (doctorId) => set({ selectedDoctorId: doctorId }),
}));
