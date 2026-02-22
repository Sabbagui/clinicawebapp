'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePatientStore } from '@/lib/stores/patient-store';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { PatientDetailSection, DetailItem } from '@/components/patients/patient-detail-section';
import { formatCPF, formatPhone, formatDateOnly, formatZipCode, calculateAge } from '@/lib/utils';
import { ArrowLeft, Pencil, Archive, ClipboardList } from 'lucide-react';

export default function PatientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { currentPatient, fetchPatient, removePatient, isLoading, error } = usePatientStore();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPatient(params.id);
  }, [params.id, fetchPatient]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await removePatient(params.id);
      router.push('/dashboard/patients');
    } catch (err) {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
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

  const age = calculateAge(currentPatient.birthDate);
  const fullAddress = `${currentPatient.address.street}, ${currentPatient.address.number}${
    currentPatient.address.complement ? ` - ${currentPatient.address.complement}` : ''
  }, ${currentPatient.address.neighborhood}, ${currentPatient.address.city} - ${
    currentPatient.address.state
  }, CEP ${formatZipCode(currentPatient.address.zipCode)}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/patients')}
            title="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary">{currentPatient.name}</h1>
            <p className="text-muted-foreground mt-1">
              {formatCPF(currentPatient.cpf)} • {age} anos
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/patients/${params.id}/history`)}
          >
            <ClipboardList className="h-4 w-4 mr-2" />
            Histórico
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/patients/${params.id}/edit`)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive hover:text-destructive"
          >
            <Archive className="h-4 w-4 mr-2" />
            Desativar
          </Button>
        </div>
      </div>

      {/* Patient Information */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <PatientDetailSection title="Informações Básicas">
          <DetailItem label="Nome Completo" value={currentPatient.name} />
          <DetailItem label="CPF" value={formatCPF(currentPatient.cpf)} />
          <DetailItem
            label="Data de Nascimento"
            value={`${formatDateOnly(currentPatient.birthDate)} (${age} anos)`}
          />
        </PatientDetailSection>

        {/* Contact */}
        <PatientDetailSection title="Contato">
          <DetailItem label="Telefone" value={formatPhone(currentPatient.phone)} />
          <DetailItem
            label="WhatsApp"
            value={currentPatient.whatsapp ? formatPhone(currentPatient.whatsapp) : null}
          />
          <DetailItem label="Email" value={currentPatient.email} />
        </PatientDetailSection>

        {/* Address */}
        <PatientDetailSection title="Endereço">
          <DetailItem label="Endereço Completo" value={fullAddress} />
        </PatientDetailSection>

        {/* Emergency Contact */}
        {currentPatient.emergencyContact && (
          <PatientDetailSection title="Contato de Emergência">
            <DetailItem label="Nome" value={currentPatient.emergencyContact.name} />
            <DetailItem label="Relação" value={currentPatient.emergencyContact.relationship} />
            <DetailItem
              label="Telefone"
              value={formatPhone(currentPatient.emergencyContact.phone)}
            />
          </PatientDetailSection>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => !isDeleting && setShowDeleteDialog(false)}
          />

          {/* Dialog */}
          <div className="relative z-50 w-full max-w-lg mx-4 bg-card border rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-2">Confirmar Desativação</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Tem certeza que deseja desativar o paciente{' '}
              <strong>{currentPatient.name}</strong>? O cadastro será arquivado e não aparecerá mais na lista de pacientes ativos.
            </p>

            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Desativando...' : 'Desativar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
