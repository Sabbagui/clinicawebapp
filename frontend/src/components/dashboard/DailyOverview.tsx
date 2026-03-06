'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import {
  type AppointmentListItem,
  type AppointmentStatus,
  getDailyOverview,
  updateAppointmentStatus,
} from '@/lib/api/appointments';
import { getApiErrorMessage } from '@/lib/api/error-utils';
import { AppointmentStatusBadge } from '@/components/appointments/appointment-status-badge';

function todayIsoDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getUpcomingAppointments(appointments: AppointmentListItem[]) {
  const now = Date.now();
  return appointments
    .filter((item) => item.date && item.startTime)
    .map((item) => {
      const date = item.date!.slice(0, 10);
      const time = item.startTime!.slice(11, 16);
      return { ...item, datetime: new Date(`${date}T${time}:00.000Z`).getTime() };
    })
    .filter((item) => item.datetime >= now)
    .sort((a, b) => a.datetime - b.datetime)
    .slice(0, 5);
}

function buildNextStatuses(status: AppointmentStatus): AppointmentStatus[] {
  if (status === 'SCHEDULED') return ['CONFIRMED', 'NO_SHOW', 'CANCELLED'];
  if (status === 'CONFIRMED') return ['CHECKED_IN', 'NO_SHOW', 'CANCELLED'];
  if (status === 'CHECKED_IN') return ['IN_PROGRESS'];
  if (status === 'IN_PROGRESS') return ['COMPLETED'];
  return [];
}

function actionLabel(status: AppointmentStatus) {
  const labels: Record<AppointmentStatus, string> = {
    SCHEDULED: 'Agendado',
    CONFIRMED: 'Confirmar',
    CHECKED_IN: 'Check-in',
    IN_PROGRESS: 'Iniciar',
    COMPLETED: 'Finalizar',
    CANCELLED: 'Cancelar',
    NO_SHOW: 'Não Compareceu',
  };
  return labels[status];
}

export function DailyOverview() {
  const [date] = useState(todayIsoDate());
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<AppointmentListItem[]>([]);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getDailyOverview(date);
      const flattened = response.doctors.flatMap((group) => group.appointments);
      setAppointments(flattened);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Não foi possível carregar o resumo diário.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [date]);

  const counters = useMemo(() => {
    const total = appointments.length;
    const confirmed = appointments.filter((item) => item.status === 'CONFIRMED').length;
    const checkedIn = appointments.filter((item) => item.status === 'CHECKED_IN').length;
    const completed = appointments.filter((item) => item.status === 'COMPLETED').length;
    const noShow = appointments.filter((item) => item.status === 'NO_SHOW').length;
    return { total, confirmed, checkedIn, completed, noShow };
  }, [appointments]);

  const upcoming = useMemo(() => getUpcomingAppointments(appointments), [appointments]);

  const handleQuickAction = async (appointmentId: string, status: AppointmentStatus) => {
    setIsUpdating(appointmentId + status);
    try {
      let cancelReason: string | undefined;
      if (status === 'CANCELLED') {
        const reason = window.prompt('Informe o motivo do cancelamento:');
        if (!reason) {
          setIsUpdating(null);
          return;
        }
        cancelReason = reason;
      }
      await updateAppointmentStatus(appointmentId, status, cancelReason);
      await load();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Não foi possível atualizar o status.'));
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo Diario</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <Alert variant="destructive">{error}</Alert>}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatBox label="Total" value={counters.total} />
          <StatBox label="Confirmados" value={counters.confirmed} />
          <StatBox label="Check-in" value={counters.checkedIn} />
          <StatBox label="Concluídos" value={counters.completed} />
          <StatBox label="Faltas" value={counters.noShow} />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Próximos 5 atendimentos</p>
          {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {!isLoading && upcoming.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum atendimento futuro para hoje.</p>
          )}
          {!isLoading &&
            upcoming.map((item) => {
              const time = item.startTime?.slice(11, 16) ?? '--:--';
              const nextStatuses = buildNextStatuses(item.status);
              return (
                <div key={item.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-medium">{item.patient.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.doctor.name} - {time}
                      </p>
                    </div>
                    <AppointmentStatusBadge status={item.status} />
                  </div>
                  {nextStatuses.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {nextStatuses.map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant="outline"
                          disabled={isUpdating === item.id + status}
                          onClick={() => handleQuickAction(item.id, status)}
                        >
                          {actionLabel(status)}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
