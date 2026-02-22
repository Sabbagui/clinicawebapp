'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { AppointmentStatusBadge } from '@/components/appointments/appointment-status-badge';
import {
  getDayDashboard,
  confirmAppointment,
  noShowAppointment,
  cancelAppointment,
  type DayDashboardResponse,
  type DayRow,
  type DayKpis,
} from '@/lib/api/endpoints/appointments';
import { getApiErrorMessage } from '@/lib/api/error-utils';
import { startEncounter, completeAppointment } from '@/lib/api/endpoints/medical-records';
import { getDoctors, type Doctor } from '@/lib/api/endpoints/users';
import { useAuthStore } from '@/lib/stores/auth-store';
import { formatTime, formatPhone, formatBRLFromCents, cn } from '@/lib/utils';
import { STATUS_CONFIG } from '@/lib/constants/appointment-constants';
import { UserRole } from '@/types';
import {
  ClipboardList,
  ExternalLink,
  Check,
  Play,
  XCircle,
  UserX,
  FileText,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

function todayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos os status' },
  ...Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
    value,
    label: cfg.label,
  })),
];

function extractApiError(err: unknown): string {
  return getApiErrorMessage(err, 'Erro ao executar ação');
}

export default function TodayDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [data, setData] = useState<DayDashboardResponse | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [doctorFilter, setDoctorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const date = todayDateString();
  const role = user?.role as UserRole | undefined;
  const isAdmin = role === UserRole.ADMIN;
  const isReceptionist = role === UserRole.RECEPTIONIST;
  const canFilterDoctor = isAdmin || isReceptionist;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getDayDashboard(
        date,
        doctorFilter || undefined,
        statusFilter || undefined,
      );
      setData(result);
    } catch (err: unknown) {
      setError(extractApiError(err));
    } finally {
      setIsLoading(false);
    }
  }, [date, doctorFilter, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (canFilterDoctor) {
      getDoctors().then(setDoctors).catch(() => {});
    }
  }, [canFilterDoctor]);

  const runAction = async (id: string, action: () => Promise<unknown>) => {
    setActionInProgress(id);
    setActionError(null);
    try {
      await action();
      await fetchData();
    } catch (err: unknown) {
      setActionError(extractApiError(err));
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCancel = (id: string) => {
    const reason = prompt('Motivo do cancelamento (opcional):');
    if (reason === null) return;
    runAction(id, () => cancelAppointment(id));
  };

  // Determine "now" row: current slot or next upcoming
  const nowRowId = useMemo(() => {
    if (!data) return null;
    const now = Date.now();
    // Active slot: startTime <= now < endTime
    const active = data.rows.find(
      (r) => new Date(r.startTime).getTime() <= now && now < new Date(r.endTime).getTime()
        && !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(r.status),
    );
    if (active) return active.id;
    // Next upcoming
    const next = data.rows.find(
      (r) => new Date(r.startTime).getTime() > now
        && !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(r.status),
    );
    return next?.id ?? null;
  }, [data]);

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const kpis = data?.kpis;
  const rows = data?.rows ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary">Painel do Dia</h1>
        <p className="text-muted-foreground mt-1 capitalize">{todayFormatted}</p>
      </div>

      {/* KPI Strip */}
      {kpis && <KpiStrip kpis={kpis} />}

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        {canFilterDoctor && (
          <div className="w-56">
            <Select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
            >
              <option value="">Todos os médicos</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="w-56">
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
        <span className="text-sm text-muted-foreground">
          {rows.length} agendamento{rows.length !== 1 ? 's' : ''}
        </span>
      </div>

      {actionError && <Alert variant="destructive">{actionError}</Alert>}

      {/* Loading */}
      {isLoading && !data && (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {/* Error */}
      {error && !data && <Alert variant="destructive">{error}</Alert>}

      {/* Empty */}
      {!isLoading && !error && rows.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Nenhum agendamento para hoje</p>
          <p className="text-sm mt-1">
            {doctorFilter || statusFilter
              ? 'Tente remover os filtros'
              : 'Não há consultas agendadas para esta data'}
          </p>
        </div>
      )}

      {/* Table */}
      {rows.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                  Horário
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                  Paciente
                </th>
                {canFilterDoctor && (
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    Médico(a)
                  </th>
                )}
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <DashboardRow
                  key={row.id}
                  row={row}
                  isNowRow={row.id === nowRowId}
                  isActioning={actionInProgress === row.id}
                  role={role}
                  showDoctor={canFilterDoctor}
                  onConfirm={() => runAction(row.id, () => confirmAppointment(row.id))}
                  onStart={() => runAction(row.id, () => startEncounter(row.id))}
                  onComplete={() => runAction(row.id, () => completeAppointment(row.id))}
                  onNoShow={() => runAction(row.id, () => noShowAppointment(row.id))}
                  onCancel={() => handleCancel(row.id)}
                  onViewAppointment={() => router.push(`/dashboard/appointments/${row.id}`)}
                  onViewHistory={() => router.push(`/dashboard/patients/${row.patient.id}/history`)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- KPI Strip ---------- */

function KpiStrip({ kpis }: { kpis: DayKpis }) {
  const items = [
    { label: 'Total', value: kpis.total, color: 'bg-slate-100 text-slate-700' },
    { label: 'Restantes', value: kpis.remaining, color: 'bg-blue-100 text-blue-700' },
    { label: 'Confirmados', value: kpis.confirmed, color: 'bg-green-100 text-green-700' },
    { label: 'Em Atend.', value: kpis.inProgress, color: 'bg-yellow-100 text-yellow-700' },
    { label: 'Concluídos', value: kpis.completed, color: 'bg-gray-100 text-gray-700' },
    { label: 'Faltas', value: kpis.noShow, color: 'bg-orange-100 text-orange-700' },
    { label: 'Cancelados', value: kpis.cancelled, color: 'bg-red-100 text-red-700' },
    { label: 'Recebido', value: formatBRLFromCents(kpis.receivedCents), color: 'bg-emerald-100 text-emerald-700' },
    { label: 'Pendente', value: formatBRLFromCents(kpis.pendingCents), color: 'bg-amber-100 text-amber-700' },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-9 gap-3">
      {items.map((item) => (
        <div key={item.label} className={`rounded-lg px-3 py-2 ${item.color}`}>
          <p className="text-xs font-medium opacity-80">{item.label}</p>
          <p className="text-xl font-bold">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------- Dashboard Row ---------- */

function DashboardRow({
  row,
  isNowRow,
  isActioning,
  role,
  showDoctor,
  onConfirm,
  onStart,
  onComplete,
  onNoShow,
  onCancel,
  onViewAppointment,
  onViewHistory,
}: {
  row: DayRow;
  isNowRow: boolean;
  isActioning: boolean;
  role?: UserRole;
  showDoctor: boolean;
  onConfirm: () => void;
  onStart: () => void;
  onComplete: () => void;
  onNoShow: () => void;
  onCancel: () => void;
  onViewAppointment: () => void;
  onViewHistory: () => void;
}) {
  const isAdmin = role === UserRole.ADMIN;
  const isReceptionist = role === UserRole.RECEPTIONIST;
  const isDoctorOrNurse = role === UserRole.DOCTOR || role === UserRole.NURSE;

  // RBAC matrix
  const canConfirm = row.status === 'SCHEDULED'; // all roles
  const canStart =
    row.status === 'CONFIRMED' &&
    (isAdmin || isDoctorOrNurse);
  const canComplete = row.status === 'IN_PROGRESS' && (isAdmin || isDoctorOrNurse);
  const canNoShow =
    row.status === 'CONFIRMED' && (isAdmin || isReceptionist);
  const canCancel =
    (row.status === 'SCHEDULED' || row.status === 'CONFIRMED') &&
    (isAdmin || isReceptionist);
  const isInProgress = row.status === 'IN_PROGRESS';
  const isCompleted = row.status === 'COMPLETED';

  return (
    <tr
      className={cn(
        'border-b last:border-b-0 transition-colors',
        isNowRow
          ? 'bg-primary/5 border-l-4 border-l-primary'
          : 'hover:bg-muted/30',
      )}
    >
      {/* Time */}
      <td className="px-4 py-3">
        <span className="font-medium">{formatTime(row.startTime)}</span>
        <span className="text-xs text-muted-foreground ml-1">
          {row.durationMinutes}min
        </span>
      </td>

      {/* Patient */}
      <td className="px-4 py-3">
        <div className="font-medium">{row.patient.name}</div>
        {row.patient.phone && (
          <div className="text-xs text-muted-foreground">
            {formatPhone(row.patient.phone)}
          </div>
        )}
      </td>

      {/* Doctor (conditional) */}
      {showDoctor && (
        <td className="px-4 py-3 text-sm">{row.doctor.name}</td>
      )}

      {/* Status + Flags */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <AppointmentStatusBadge status={row.status} />
          {row.flags.upcomingUnconfirmed && (
            <FlagChip color="amber" label="Confirmar em breve" />
          )}
          {row.flags.missingSoap && (
            <FlagChip color="red" label="Sem SOAP" />
          )}
          {row.flags.overdueInProgress && (
            <FlagChip color="red" label="Atrasado" />
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1 flex-wrap">
          {canConfirm && (
            <ActionBtn
              disabled={isActioning}
              onClick={onConfirm}
              title="Confirmar"
              color="text-green-600 hover:text-green-700 hover:bg-green-50"
              icon={<Check className="h-4 w-4" />}
            />
          )}
          {canStart && (
            <ActionBtn
              disabled={isActioning}
              onClick={onStart}
              title="Iniciar Atendimento"
              color="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
              icon={<Play className="h-4 w-4" />}
            />
          )}
          {canNoShow && (
            <ActionBtn
              disabled={isActioning}
              onClick={onNoShow}
              title="Não Compareceu"
              color="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              icon={<UserX className="h-4 w-4" />}
            />
          )}
          {canCancel && (
            <ActionBtn
              disabled={isActioning}
              onClick={onCancel}
              title="Cancelar"
              color="text-red-600 hover:text-red-700 hover:bg-red-50"
              icon={<XCircle className="h-4 w-4" />}
            />
          )}
          {(isInProgress || isCompleted) && !isReceptionist && (
            <ActionBtn
              disabled={false}
              onClick={onViewAppointment}
              title={isInProgress ? 'Abrir SOAP' : 'Ver SOAP'}
              color="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              icon={<FileText className="h-4 w-4" />}
            />
          )}
          {canComplete && (
            <ActionBtn
              disabled={isActioning}
              onClick={onComplete}
              title="Concluir Atendimento"
              color="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              icon={<Check className="h-4 w-4" />}
            />
          )}
          <ActionBtn
            disabled={false}
            onClick={onViewHistory}
            title="Histórico do Paciente"
            color=""
            icon={<ClipboardList className="h-4 w-4" />}
          />
          <ActionBtn
            disabled={false}
            onClick={onViewAppointment}
            title="Ver Detalhes"
            color=""
            icon={<ExternalLink className="h-4 w-4" />}
          />
        </div>
      </td>
    </tr>
  );
}

/* ---------- Helpers ---------- */

function ActionBtn({
  disabled,
  onClick,
  title,
  color,
  icon,
}: {
  disabled: boolean;
  onClick: () => void;
  title: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={color}
    >
      {icon}
    </Button>
  );
}

function FlagChip({ color, label }: { color: 'amber' | 'red'; label: string }) {
  const colors =
    color === 'amber'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-red-100 text-red-700';

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${colors}`}
    >
      <AlertTriangle className="h-3 w-3" />
      {label}
    </span>
  );
}
