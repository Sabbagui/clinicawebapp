'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { AppointmentStatusBadge } from '@/components/appointments/appointment-status-badge';
import { getApiErrorMessage } from '@/lib/api/error-utils';
import {
  type AppointmentListItem,
  type AppointmentStatus,
  updateAppointmentStatus,
} from '@/lib/api/appointments';

interface AppointmentDetailPanelProps {
  open: boolean;
  appointment: AppointmentListItem | null;
  onClose: () => void;
  onStatusUpdated: () => Promise<void> | void;
}

function statusLabel(status: AppointmentStatus): string {
  const labels: Record<AppointmentStatus, string> = {
    SCHEDULED: 'Agendado',
    CONFIRMED: 'Confirmado',
    CHECKED_IN: 'Check-in',
    IN_PROGRESS: 'Em Atendimento',
    COMPLETED: 'Concluido',
    CANCELLED: 'Cancelado',
    NO_SHOW: 'Nao Compareceu',
  };
  return labels[status];
}

function getActionList(status: AppointmentStatus): Array<{ label: string; status: AppointmentStatus }> {
  if (status === 'SCHEDULED') {
    return [
      { label: 'Confirmar', status: 'CONFIRMED' },
      { label: 'Cancelar', status: 'CANCELLED' },
      { label: 'Marcar como Nao Compareceu', status: 'NO_SHOW' },
    ];
  }
  if (status === 'CONFIRMED') {
    return [
      { label: 'Check-in', status: 'CHECKED_IN' },
      { label: 'Cancelar', status: 'CANCELLED' },
      { label: 'Marcar como Nao Compareceu', status: 'NO_SHOW' },
    ];
  }
  if (status === 'CHECKED_IN') {
    return [{ label: 'Iniciar Atendimento', status: 'IN_PROGRESS' }];
  }
  if (status === 'IN_PROGRESS') {
    return [{ label: 'Finalizar', status: 'COMPLETED' }];
  }
  return [];
}

function extractDateAndTime(appointment: AppointmentDetailPanelProps['appointment']) {
  if (!appointment || !appointment.date || !appointment.startTime || !appointment.endTime) {
    return { date: '-', time: '-' };
  }
  const date = new Date(appointment.date).toLocaleDateString('pt-BR');
  const start = appointment.startTime.slice(11, 16);
  const end = appointment.endTime.slice(11, 16);
  return { date, time: `${start} - ${end}` };
}

export function AppointmentDetailPanel({
  open,
  appointment,
  onClose,
  onStatusUpdated,
}: AppointmentDetailPanelProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !appointment) return null;

  const actions = getActionList(appointment.status);
  const { date, time } = extractDateAndTime(appointment);

  const handleStatusChange = async (nextStatus: AppointmentStatus) => {
    setIsLoading(true);
    setError(null);
    try {
      let cancelReason: string | undefined;
      if (nextStatus === 'CANCELLED') {
        const reason = window.prompt('Informe o motivo do cancelamento:');
        if (!reason) {
          setIsLoading(false);
          return;
        }
        cancelReason = reason;
      }

      await updateAppointmentStatus(appointment.id, nextStatus, cancelReason);
      await onStatusUpdated();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Nao foi possivel atualizar o status.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-background/70" onClick={onClose} />

      <aside className="absolute right-0 top-0 h-full w-full max-w-md border-l bg-card shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Detalhes do Agendamento</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 p-4">
          {error && <Alert variant="destructive">{error}</Alert>}

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Paciente</p>
            <button
              className="text-left font-medium text-primary hover:underline"
              onClick={() => router.push(`/dashboard/patients/${appointment.patientId}`)}
            >
              {appointment.patient.name}
            </button>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Medico</p>
            <p className="font-medium">{appointment.doctor.name}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p className="font-medium">{appointment.type}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Status</p>
              <AppointmentStatusBadge status={appointment.status} />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Data</p>
              <p className="font-medium">{date}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Horario</p>
              <p className="font-medium">{time}</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Observacoes</p>
            <p className="text-sm">{appointment.notes || 'Sem observacoes.'}</p>
          </div>

          {appointment.cancelReason && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Motivo do cancelamento: {appointment.cancelReason}
            </div>
          )}

          {actions.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs text-muted-foreground">Acoes</p>
              <div className="flex flex-wrap gap-2">
                {actions.map((action) => (
                  <Button
                    key={`${appointment.id}-${action.status}`}
                    size="sm"
                    variant={action.status === 'CANCELLED' ? 'outline' : 'default'}
                    disabled={isLoading}
                    onClick={() => handleStatusChange(action.status)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 text-xs text-muted-foreground">
            Status atual: {statusLabel(appointment.status)}
          </div>
        </div>
      </aside>
    </div>
  );
}
