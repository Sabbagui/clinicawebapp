'use client';

import { useRouter } from 'next/navigation';
import { usePatientStore } from '@/lib/stores/patient-store';
import { PatientForm } from '@/components/patients/patient-form';
import { PatientFormData } from '@/lib/validation/patient-schema';
import { Alert } from '@/components/ui/alert';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function NewPatientPage() {
  const router = useRouter();
  const { addPatient } = usePatientStore();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: PatientFormData) => {
    try {
      setError(null);
      const newPatient = await addPatient(data);
      router.push(`/dashboard/patients/${newPatient.id}`);
    } catch (err: any) {
      // Handle specific errors
      if (err.response?.status === 409) {
        setError('CPF já cadastrado no sistema');
      } else {
        setError(err.response?.data?.message || 'Erro ao criar paciente');
      }
      throw err; // Re-throw so form stays in submitting state
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/patients');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          title="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-primary">Novo Paciente</h1>
          <p className="text-muted-foreground mt-1">
            Preencha os dados do novo paciente
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          {error}
        </Alert>
      )}

      {/* Form */}
      <div className="bg-card border rounded-lg p-6">
        <PatientForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Criar Paciente"
        />
      </div>
    </div>
  );
}
