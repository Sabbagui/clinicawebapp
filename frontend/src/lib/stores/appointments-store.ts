import { create } from 'zustand';
import {
  type AppointmentListFilters,
  type AppointmentListItem,
  type AppointmentStatus,
  type AvailableSlot,
  type CreateAppointmentDto,
  createAppointment as createAppointmentApi,
  getAppointments,
  getAvailableSlots,
  updateAppointmentStatus,
  rescheduleAppointment as rescheduleAppointmentApi,
} from '@/lib/api/appointments';
import {
  type Appointment,
  getAppointment,
  createAppointment as legacyCreateAppointment,
  updateAppointment,
  updateAppointmentStatus as legacyUpdateStatus,
} from '@/lib/api/endpoints/appointments';
import type { AppointmentFormData } from '@/lib/validation/appointment-schema';
import { getApiErrorMessage } from '@/lib/api/error-utils';

// ─── State shape ─────────────────────────────────────────────────────────────

interface AppointmentsStoreState {
  // ── Calendar / list view (new API — AppointmentListItem) ──────────────────
  /** Flat list of appointments shown in the calendar (FullCalendar). */
  appointments: AppointmentListItem[];
  /** Currently selected date for the calendar filter (ISO 'YYYY-MM-DD'). */
  selectedDate: string;
  /** Doctor filter applied to the calendar view ('': all doctors). */
  selectedDoctorId: string;
  /** Time slots available for a given doctor/date combination. */
  availableSlots: AvailableSlot[];

  // ── Detail / edit view (legacy API — Appointment with scheduledDate: Date) ─
  /** Single appointment loaded for the detail or edit page. */
  currentAppointment: Appointment | null;

  // ── Shared ────────────────────────────────────────────────────────────────
  isLoading: boolean;
  error: string | null;

  // ── Calendar / list actions ───────────────────────────────────────────────
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

  // ── Detail / edit actions (legacy API) ────────────────────────────────────
  /** Create an appointment via the legacy API using AppointmentFormData. */
  addAppointment: (data: AppointmentFormData) => Promise<Appointment>;
  /** Load a single appointment into currentAppointment (detail/edit pages). */
  fetchAppointment: (id: string) => Promise<void>;
  /** Update a single appointment via the legacy API using AppointmentFormData. */
  editAppointment: (id: string, data: AppointmentFormData) => Promise<Appointment>;
  /** Change status via the legacy API (detail page status action buttons). */
  changeStatus: (id: string, status: string) => Promise<Appointment>;
  clearError: () => void;
  clearCurrentAppointment: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayIsoDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAppointmentsStore = create<AppointmentsStoreState>((set, get) => ({
  // ── Initial state ─────────────────────────────────────────────────────────
  appointments: [],
  selectedDate: todayIsoDate(),
  selectedDoctorId: '',
  availableSlots: [],
  currentAppointment: null,
  isLoading: false,
  error: null,

  // ── Calendar / list actions ───────────────────────────────────────────────

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
        appointments: state.appointments.map((a) => (a.id === id ? updated : a)),
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
      set({ error: getApiErrorMessage(error, 'Erro ao carregar horários disponíveis.') });
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

  // ── Detail / edit actions (legacy API) ────────────────────────────────────

  addAppointment: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newAppointment = await legacyCreateAppointment(data);
      set({ isLoading: false });
      return newAppointment;
    } catch (error: any) {
      set({
        error: getApiErrorMessage(error, 'Erro ao criar agendamento'),
        isLoading: false,
      });
      throw error;
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

  editAppointment: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await updateAppointment(id, data);
      set({ currentAppointment: updated, isLoading: false });
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
      const updated = await legacyUpdateStatus(id, status);
      set((state) => ({
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

  clearError: () => set({ error: null }),
  clearCurrentAppointment: () => set({ currentAppointment: null }),
}));
