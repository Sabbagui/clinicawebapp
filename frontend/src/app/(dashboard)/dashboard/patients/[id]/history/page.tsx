'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { AppointmentStatusBadge } from '@/components/appointments/appointment-status-badge';
import {
  getPatientHistory,
  type PatientHistoryResponse,
  type TimelineEntry,
} from '@/lib/api/endpoints/patients';
import { getApiErrorMessage } from '@/lib/api/error-utils';
import { useAuthStore } from '@/lib/stores/auth-store';
import { formatDateTime, formatDate, formatPhone, calculateAge } from '@/lib/utils';
import { AppointmentStatus, UserRole } from '@/types';
import { ArrowLeft, Calendar, Clock, User, FileText, CreditCard } from 'lucide-react';

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Dinheiro',
  PIX: 'PIX',
  CREDIT_CARD: 'Cartão de Crédito',
  DEBIT_CARD: 'Cartão de Débito',
  HEALTH_INSURANCE: 'Convênio',
};

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: AppointmentStatus.COMPLETED, label: 'Concluído' },
  { value: AppointmentStatus.SCHEDULED, label: 'Agendado' },
  { value: AppointmentStatus.CONFIRMED, label: 'Confirmado' },
  { value: AppointmentStatus.IN_PROGRESS, label: 'Em Atendimento' },
  { value: AppointmentStatus.CANCELLED, label: 'Cancelado' },
  { value: AppointmentStatus.NO_SHOW, label: 'Não Compareceu' },
];

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function PatientHistoryPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [data, setData] = useState<PatientHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchHistory = useCallback(async (status?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getPatientHistory(params.id, {
        status: status ? (status as AppointmentStatus) : undefined,
      });
      setData(result);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Erro ao carregar histórico do paciente'));
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchHistory(statusFilter);
  }, [fetchHistory, statusFilter]);

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">{error}</Alert>
        <Button onClick={() => router.push(`/dashboard/patients/${params.id}`)}>
          Voltar para detalhes
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const { patient, stats, timeline } = data;
  const age = calculateAge(patient.birthDate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/dashboard/patients/${params.id}`)}
            title="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary">{patient.name}</h1>
            <p className="text-muted-foreground mt-1">
              {age} anos {patient.phone ? `\u2022 ${formatPhone(patient.phone)}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatChip
          label="Consultas"
          value={stats.completedCount}
          color="bg-green-100 text-green-700"
        />
        <StatChip
          label="Faltas"
          value={stats.noShowCount}
          color="bg-orange-100 text-orange-700"
        />
        <StatChip
          label="Cancelamentos"
          value={stats.cancelledCount}
          color="bg-red-100 text-red-700"
        />
        <StatChip
          label="Última consulta"
          value={stats.lastVisitAt ? formatDate(stats.lastVisitAt) : '—'}
          color="bg-blue-100 text-blue-700"
        />
        <StatChip
          label="Próxima consulta"
          value={stats.nextAppointmentAt ? formatDate(stats.nextAppointmentAt) : '—'}
          color="bg-purple-100 text-purple-700"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="w-64">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
        {isLoading && <span className="text-sm text-muted-foreground">Carregando...</span>}
      </div>

      {/* Timeline */}
      {timeline.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Nenhum registro encontrado</p>
          <p className="text-sm mt-1">
            {statusFilter
              ? 'Tente remover o filtro de status'
              : 'Este paciente ainda não possui histórico de atendimentos'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {timeline.map((entry) => (
            <TimelineCard
              key={entry.appointmentId}
              entry={entry}
              patientId={params.id}
              isReceptionist={user?.role === UserRole.RECEPTIONIST}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className={`rounded-lg p-4 ${color}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}

function TimelineCard({
  entry,
  patientId,
  isReceptionist,
}: {
  entry: TimelineEntry;
  patientId: string;
  isReceptionist: boolean;
}) {
  const router = useRouter();

  return (
    <div className="border rounded-lg bg-card shadow-sm p-5">
      {/* Card header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formatDateTime(entry.scheduledDate)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{entry.duration} min</span>
          </div>
          <span className="text-sm text-muted-foreground">{entry.type}</span>
        </div>
        <div className="flex items-center gap-2">
          <AppointmentStatusBadge status={entry.status} />
        </div>
      </div>

      {/* Doctor */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
        <User className="h-4 w-4" />
        <span>{entry.doctor.name}</span>
      </div>

      {/* SOAP Preview */}
      {entry.medicalRecord && !isReceptionist && (
        <div className="border-t pt-3 mt-1 space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-medium mb-2">
            <FileText className="h-4 w-4" />
            <span>Prontuário</span>
            <span
              className={`ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                entry.medicalRecord.status === 'FINAL'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {entry.medicalRecord.status === 'FINAL' ? 'Finalizado' : 'Rascunho'}
            </span>
          </div>
          {entry.medicalRecord.subjectivePreview && (
            <SoapPreviewField label="S" value={entry.medicalRecord.subjectivePreview} />
          )}
          {entry.medicalRecord.assessmentPreview && (
            <SoapPreviewField label="A" value={entry.medicalRecord.assessmentPreview} />
          )}
          {entry.medicalRecord.planPreview && (
            <SoapPreviewField label="P" value={entry.medicalRecord.planPreview} />
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs mt-1"
            onClick={() =>
              router.push(`/dashboard/patients/${patientId}`)
            }
          >
            Ver prontuário completo
          </Button>
        </div>
      )}

      {/* Payment */}
      {entry.payment && (
        <div className="border-t pt-3 mt-3">
          <div className="flex items-center gap-3 text-sm">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{formatCurrency(entry.payment.amount)}</span>
            <span className="text-muted-foreground">
              {PAYMENT_METHOD_LABELS[entry.payment.method] || entry.payment.method}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                entry.payment.status === 'PAID'
                  ? 'bg-green-100 text-green-700'
                  : entry.payment.status === 'PENDING'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
              }`}
            >
              {PAYMENT_STATUS_LABELS[entry.payment.status] || entry.payment.status}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function SoapPreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="font-semibold text-muted-foreground w-5 shrink-0">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
