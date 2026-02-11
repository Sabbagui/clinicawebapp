'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppointmentStore } from '@/lib/stores/appointment-store';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AppointmentDayView } from '@/components/appointments/appointment-day-view';
import { AppointmentListView } from '@/components/appointments/appointment-list-view';
import { EmptyAppointmentsState } from '@/components/appointments/empty-appointments-state';
import { Plus, ChevronLeft, ChevronRight, Calendar, List } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function AppointmentsPage() {
  const router = useRouter();
  const { appointments, isLoading, error, fetchAppointments, selectedDate, setSelectedDate } =
    useAppointmentStore();
  const [viewMode, setViewMode] = useState<'day' | 'list'>('day');

  const loadAppointments = useCallback(() => {
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);
    fetchAppointments(start.toISOString(), end.toISOString());
  }, [selectedDate, fetchAppointments]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const goToPreviousDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const isToday =
    new Date().toDateString() === new Date(selectedDate).toDateString();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Agendamentos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as consultas do consultório
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/appointments/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Consulta
        </Button>
      </div>

      {/* Date Navigation + View Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="text-center min-w-[180px]">
            <p className="font-semibold">{formatDate(selectedDate)}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(selectedDate).toLocaleDateString('pt-BR', { weekday: 'long' })}
            </p>
          </div>

          <Button variant="outline" size="icon" onClick={goToNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          {!isToday && (
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoje
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === 'day' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('day')}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Dia
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4 mr-1" />
            Lista
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          Erro ao carregar agendamentos: {error}
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && appointments.length === 0 && !error && (
        <EmptyAppointmentsState />
      )}

      {/* Appointments View */}
      {!isLoading && appointments.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            {appointments.length} agendamento{appointments.length !== 1 ? 's' : ''} para este dia
          </p>
          {viewMode === 'day' ? (
            <AppointmentDayView appointments={appointments} />
          ) : (
            <AppointmentListView appointments={appointments} />
          )}
        </>
      )}
    </div>
  );
}
