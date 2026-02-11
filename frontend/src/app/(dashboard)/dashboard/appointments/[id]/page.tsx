'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppointmentStore } from '@/lib/stores/appointment-store';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { AppointmentStatusBadge } from '@/components/appointments/appointment-status-badge';
import { AppointmentStatusActions } from '@/components/appointments/appointment-status-actions';
import { formatDate, formatTime, formatPhone } from '@/lib/utils';
import { ArrowLeft, Pencil, Clock, User, Stethoscope, FileText } from 'lucide-react';

export default function AppointmentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { currentAppointment, fetchAppointment, isLoading, error } = useAppointmentStore();

  useEffect(() => {
    fetchAppointment(params.id);
  }, [params.id, fetchAppointment]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !currentAppointment) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          {error || 'Agendamento não encontrado'}
        </Alert>
        <Button onClick={() => router.push('/dashboard/appointments')}>
          Voltar para agendamentos
        </Button>
      </div>
    );
  }

  const canEdit =
    currentAppointment.status === 'SCHEDULED' || currentAppointment.status === 'CONFIRMED';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/appointments')}
            title="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-primary">
                {currentAppointment.type}
              </h1>
              <AppointmentStatusBadge status={currentAppointment.status} />
            </div>
            <p className="text-muted-foreground mt-1">
              {formatDate(currentAppointment.scheduledDate)} às{' '}
              {formatTime(currentAppointment.scheduledDate)}
            </p>
          </div>
        </div>

        {canEdit && (
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/appointments/${params.id}/edit`)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
        )}
      </div>

      {/* Detail Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Patient Info */}
        <div className="p-6 border rounded-lg bg-card shadow-sm">
          <h3 className="font-semibold text-lg mb-4 pb-2 border-b flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Paciente
          </h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Nome:</span>
              <p className="font-medium">{currentAppointment.patient.name}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Telefone:</span>
              <p className="font-medium">
                {formatPhone(currentAppointment.patient.phone)}
              </p>
            </div>
          </div>
        </div>

        {/* Appointment Info */}
        <div className="p-6 border rounded-lg bg-card shadow-sm">
          <h3 className="font-semibold text-lg mb-4 pb-2 border-b flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Detalhes da Consulta
          </h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Data e Hora:</span>
              <p className="font-medium">
                {formatDate(currentAppointment.scheduledDate)} às{' '}
                {formatTime(currentAppointment.scheduledDate)}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Duração:</span>
              <p className="font-medium">{currentAppointment.duration} minutos</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Tipo:</span>
              <p className="font-medium">{currentAppointment.type}</p>
            </div>
          </div>
        </div>

        {/* Doctor Info */}
        <div className="p-6 border rounded-lg bg-card shadow-sm">
          <h3 className="font-semibold text-lg mb-4 pb-2 border-b flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Médico(a)
          </h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Nome:</span>
              <p className="font-medium">{currentAppointment.doctor.name}</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {currentAppointment.notes && (
          <div className="p-6 border rounded-lg bg-card shadow-sm">
            <h3 className="font-semibold text-lg mb-4 pb-2 border-b flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Observações
            </h3>
            <p className="text-sm">{currentAppointment.notes}</p>
          </div>
        )}
      </div>

      {/* Status Actions */}
      <div className="p-6 border rounded-lg bg-card shadow-sm">
        <AppointmentStatusActions
          appointmentId={currentAppointment.id}
          currentStatus={currentAppointment.status}
        />
      </div>
    </div>
  );
}
