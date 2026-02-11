'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePatientStore } from '@/lib/stores/patient-store';
import { Button } from '@/components/ui/button';
import { PatientTable } from '@/components/patients/patient-table';
import { PatientSearch } from '@/components/patients/patient-search';
import { EmptyPatientsState } from '@/components/patients/empty-patients-state';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus } from 'lucide-react';
import { stripFormatting } from '@/lib/utils';

export default function PatientsPage() {
  const router = useRouter();
  const { patients, isLoading, error, fetchPatients } = usePatientStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Filter patients by search query (name or CPF)
  const filteredPatients = patients.filter((patient) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    const nameMatch = patient.name.toLowerCase().includes(query);
    const cpfMatch = stripFormatting(patient.cpf).includes(stripFormatting(query));

    return nameMatch || cpfMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Pacientes</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os cadastros de pacientes
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/patients/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Paciente
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          Erro ao carregar pacientes: {error}
        </Alert>
      )}

      {/* Search */}
      {!isLoading && patients.length > 0 && (
        <PatientSearch onSearch={setSearchQuery} />
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && patients.length === 0 && !error && <EmptyPatientsState />}

      {/* No Results */}
      {!isLoading && patients.length > 0 && filteredPatients.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Nenhum paciente encontrado para "{searchQuery}"
          </p>
        </div>
      )}

      {/* Patient List */}
      {!isLoading && filteredPatients.length > 0 && (
        <PatientTable
          patients={filteredPatients}
          onDelete={(id) => {
            router.push(`/dashboard/patients/${id}`);
          }}
        />
      )}
    </div>
  );
}
