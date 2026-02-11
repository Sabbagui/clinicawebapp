'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppointmentStore } from '@/lib/stores/appointment-store';
import { AppointmentForm } from '@/components/appointments/appointment-form';
import { AppointmentFormData } from '@/lib/validation/appointment-schema';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EditAppointmentPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { currentAppointment, fetchAppointment, editAppointment, isLoading, error } =
    useAppointmentStore();
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetchAppointment(params.id);
  }, [params.id, fetchAppointment]);

  const handleSubmit = async (data: AppointmentFormData) => {
    try {
      setSubmitError(null);
      await editAppointment(params.id, data);
      router.push(`/dashboard/appointments/${params.id}`);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setSubmitError('Conflito de horário: já existe um agendamento neste período para este médico');
      } else {
        setSubmitError(err.response?.data?.message || 'Erro ao atualizar agendamento');
      }
      throw err;
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/appointments/${params.id}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
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

  // Convert Appointment to form values
  const scheduledDate = new Date(currentAppointment.scheduledDate);
  const defaultValues: AppointmentFormData = {
    patientId: currentAppointment.patientId,
    doctorId: currentAppointment.doctorId,
    date: scheduledDate.toISOString().split('T')[0],
    time: `${String(scheduledDate.getHours()).padStart(2, '0')}:${String(scheduledDate.getMinutes()).padStart(2, '0')}`,
    duration: currentAppointment.duration,
    type: currentAppointment.type,
    notes: currentAppointment.notes || '',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleCancel} title="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-primary">Editar Agendamento</h1>
          <p className="text-muted-foreground mt-1">
            {currentAppointment.patient.name} - {currentAppointment.type}
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {submitError && <Alert variant="destructive">{submitError}</Alert>}

      {/* Form */}
      <div className="bg-card border rounded-lg p-6">
        <AppointmentForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Salvar Alterações"
        />
      </div>
    </div>
  );
}
