'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePatientStore } from '@/lib/stores/patient-store';
import { PatientForm } from '@/components/patients/patient-form';
import { PatientFormData } from '@/lib/validation/patient-schema';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCPF, formatPhone, formatZipCode } from '@/lib/utils';

export default function EditPatientPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { currentPatient, fetchPatient, editPatient, isLoading, error } = usePatientStore();
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetchPatient(params.id);
  }, [params.id, fetchPatient]);

  const handleSubmit = async (data: PatientFormData) => {
    try {
      setSubmitError(null);
      await editPatient(params.id, data);
      router.push(`/dashboard/patients/${params.id}`);
    } catch (err: any) {
      // Handle specific errors
      if (err.response?.status === 409) {
        setSubmitError('CPF já cadastrado no sistema');
      } else {
        setSubmitError(err.response?.data?.message || 'Erro ao atualizar paciente');
      }
      throw err; // Re-throw so form stays in submitting state
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/patients/${params.id}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !currentPatient) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          {error || 'Paciente não encontrado'}
        </Alert>
        <Button onClick={() => router.push('/dashboard/patients')}>
          Voltar para lista
        </Button>
      </div>
    );
  }

  // Convert Patient to PatientFormData format
  const defaultValues: PatientFormData = {
    name: currentPatient.name,
    cpf: formatCPF(currentPatient.cpf),
    birthDate: currentPatient.birthDate instanceof Date
      ? currentPatient.birthDate.toISOString().split('T')[0]
      : new Date(currentPatient.birthDate).toISOString().split('T')[0],
    phone: formatPhone(currentPatient.phone),
    whatsapp: currentPatient.whatsapp ? formatPhone(currentPatient.whatsapp) : '',
    email: currentPatient.email || '',
    address: {
      zipCode: formatZipCode(currentPatient.address.zipCode),
      street: currentPatient.address.street,
      number: currentPatient.address.number,
      complement: currentPatient.address.complement || '',
      neighborhood: currentPatient.address.neighborhood,
      city: currentPatient.address.city,
      state: currentPatient.address.state,
    },
    emergencyContact: currentPatient.emergencyContact
      ? {
          name: currentPatient.emergencyContact.name,
          relationship: currentPatient.emergencyContact.relationship,
          phone: formatPhone(currentPatient.emergencyContact.phone),
        }
      : undefined,
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
          <h1 className="text-3xl font-bold text-primary">Editar Paciente</h1>
          <p className="text-muted-foreground mt-1">{currentPatient.name}</p>
        </div>
      </div>

      {/* Error Alert */}
      {submitError && (
        <Alert variant="destructive">
          {submitError}
        </Alert>
      )}

      {/* Form */}
      <div className="bg-card border rounded-lg p-6">
        <PatientForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Salvar Alterações"
        />
      </div>
    </div>
  );
}
