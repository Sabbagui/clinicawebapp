'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateClickArg } from '@fullcalendar/interaction';
import type { EventClickArg, EventInput, ViewMountArg } from '@fullcalendar/core';
import { CalendarDays, Columns3, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { getDoctors, type Doctor } from '@/lib/api/endpoints/users';
import { useAppointmentsStore } from '@/lib/stores/appointments-store';
import { NewAppointmentModal } from '@/components/appointments/NewAppointmentModal';
import { AppointmentDetailPanel } from '@/components/appointments/AppointmentDetailPanel';
import type { AppointmentListItem, AppointmentStatus } from '@/lib/api/appointments';
import { getApiErrorMessage } from '@/lib/api/error-utils';

const STATUS_STYLE: Record<
  AppointmentStatus,
  { background: string; border: string; text: string }
> = {
  SCHEDULED: { background: '#dbeafe', border: '#60a5fa', text: '#1e3a8a' },
  CONFIRMED: { background: '#dcfce7', border: '#22c55e', text: '#14532d' },
  CHECKED_IN: { background: '#fef9c3', border: '#eab308', text: '#854d0e' },
  IN_PROGRESS: { background: '#ffedd5', border: '#f97316', text: '#9a3412' },
  COMPLETED: { background: '#e5e7eb', border: '#6b7280', text: '#1f2937' },
  CANCELLED: { background: '#fee2e2', border: '#ef4444', text: '#991b1b' },
  NO_SHOW: { background: '#7f1d1d', border: '#450a0a', text: '#ffffff' },
};

function todayIsoDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function extractDatePart(value: string | null): string {
  if (!value) return todayIsoDate();
  return value.slice(0, 10);
}

function extractTimePart(value: string | null): string {
  if (!value) return '08:00';
  return value.slice(11, 16);
}

function mapAppointmentToEvent(appointment: AppointmentListItem): EventInput {
  const datePart = extractDatePart(appointment.date);
  const startPart = extractTimePart(appointment.startTime);
  const endPart = extractTimePart(appointment.endTime);
  const style = STATUS_STYLE[appointment.status];

  return {
    id: appointment.id,
    title: `${appointment.patient.name} - ${appointment.type}`,
    start: `${datePart}T${startPart}:00`,
    end: `${datePart}T${endPart}:00`,
    backgroundColor: style.background,
    borderColor: style.border,
    textColor: style.text,
    classNames: appointment.status === 'CANCELLED' ? ['line-through'] : [],
    extendedProps: {
      appointment,
    },
  };
}

export default function AppointmentsPage() {
  const calendarRef = useRef<FullCalendar>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [calendarView, setCalendarView] = useState<'timeGridDay' | 'timeGridWeek'>('timeGridDay');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState(todayIsoDate());
  const [modalTime, setModalTime] = useState('08:00');
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentListItem | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    appointments,
    selectedDate,
    selectedDoctorId,
    isLoading,
    error,
    fetchAppointments,
    setSelectedDate,
    setSelectedDoctor,
  } = useAppointmentsStore();

  useEffect(() => {
    getDoctors().then(setDoctors).catch((apiError) => {
      setLocalError(getApiErrorMessage(apiError, 'Não foi possível carregar médicos.'));
    });
  }, []);

  useEffect(() => {
    fetchAppointments({
      date: selectedDate,
      doctorId: selectedDoctorId || undefined,
      page: 1,
      limit: 100,
    });
  }, [selectedDate, selectedDoctorId, fetchAppointments]);

  const events = useMemo(() => appointments.map(mapAppointmentToEvent), [appointments]);

  const openNewModal = (date: string, time: string) => {
    setModalDate(date);
    setModalTime(time);
    setIsModalOpen(true);
  };

  const handleDateClick = (arg: DateClickArg) => {
    const date = arg.date;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    openNewModal(`${yyyy}-${mm}-${dd}`, `${hh}:${min}`);
  };

  const handleEventClick = (arg: EventClickArg) => {
    const appointment = arg.event.extendedProps.appointment as AppointmentListItem | undefined;
    if (!appointment) return;
    setSelectedAppointment(appointment);
    setIsPanelOpen(true);
  };

  const refreshAppointments = async () => {
    await fetchAppointments({
      date: selectedDate,
      doctorId: selectedDoctorId || undefined,
      page: 1,
      limit: 100,
    });
  };

  const changeCalendarView = (view: 'timeGridDay' | 'timeGridWeek') => {
    setCalendarView(view);
    const api = calendarRef.current?.getApi();
    if (api) {
      api.changeView(view);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Agendamentos</h1>
          <p className="text-sm text-muted-foreground">Agenda diária e semanal da clínica</p>
        </div>
        <Button onClick={() => openNewModal(selectedDate, '08:00')}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Agendamento
        </Button>
      </div>

      {(error || localError) && (
        <Alert variant="destructive">{error || localError}</Alert>
      )}

      <div className="rounded-lg border bg-card p-4">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end">
          <div className="w-full md:w-56">
            <label className="mb-1 block text-xs text-muted-foreground">Data</label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </div>

          <div className="w-full md:w-72">
            <label className="mb-1 block text-xs text-muted-foreground">Médico</label>
            <Select
              value={selectedDoctorId}
              onChange={(event) => setSelectedDoctor(event.target.value)}
            >
              <option value="">Todos os médicos</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex gap-2 md:ml-auto">
            <Button
              type="button"
              variant={calendarView === 'timeGridDay' ? 'default' : 'outline'}
              onClick={() => changeCalendarView('timeGridDay')}
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              Dia
            </Button>
            <Button
              type="button"
              variant={calendarView === 'timeGridWeek' ? 'default' : 'outline'}
              onClick={() => changeCalendarView('timeGridWeek')}
            >
              <Columns3 className="mr-2 h-4 w-4" />
              Semana
            </Button>
          </div>
        </div>

        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={calendarView}
          viewDidMount={(viewInfo: ViewMountArg) => {
            const currentView = viewInfo.view.type;
            if (currentView === 'timeGridDay' || currentView === 'timeGridWeek') {
              setCalendarView(currentView);
            }
          }}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: '',
          }}
          locale="pt-br"
          allDaySlot={false}
          slotMinTime="07:00:00"
          slotMaxTime="20:00:00"
          slotDuration="00:30:00"
          nowIndicator
          editable={false}
          selectable
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          events={events}
          height="auto"
        />

        {isLoading && (
          <p className="mt-3 text-sm text-muted-foreground">Atualizando agenda...</p>
        )}
      </div>

      <NewAppointmentModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultDate={modalDate}
        defaultTime={modalTime}
        defaultDoctorId={selectedDoctorId || undefined}
        onCreated={refreshAppointments}
      />

      <AppointmentDetailPanel
        open={isPanelOpen}
        appointment={selectedAppointment}
        onClose={() => setIsPanelOpen(false)}
        onStatusUpdated={refreshAppointments}
      />
    </div>
  );
}
