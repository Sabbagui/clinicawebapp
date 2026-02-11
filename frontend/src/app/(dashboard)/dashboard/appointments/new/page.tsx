'use client';

import { useRouter } from 'next/navigation';
import { useAppointmentStore } from '@/lib/stores/appointment-store';
import { AppointmentForm } from '@/components/appointments/appointment-form';
import { AppointmentFormData } from '@/lib/validation/appointment-schema';
import { Alert } from '@/components/ui/alert';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function NewAppointmentPage() {
  const router = useRouter();
  const { addAppointment } = useAppointmentStore();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: AppointmentFormData) => {
    try {
      setError(null);
      await addAppointment(data);
      router.push('/dashboard/appointments');
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('Conflito de horário: já existe um agendamento neste período para este médico');
      } else {
        setError(err.response?.data?.message || 'Erro ao criar agendamento');
      }
      throw err;
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/appointments');
  };

  // Pre-fill today's date
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleCancel} title="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-primary">Nova Consulta</h1>
          <p className="text-muted-foreground mt-1">
            Agende uma nova consulta para um paciente
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && <Alert variant="destructive">{error}</Alert>}

      {/* Form */}
      <div className="bg-card border rounded-lg p-6">
        <AppointmentForm
          defaultValues={{ date: today }}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Agendar Consulta"
        />
      </div>
    </div>
  );
}
