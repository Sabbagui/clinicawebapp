'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/auth-store';
import { getDoctors, type Doctor } from '@/lib/api/endpoints/users';
import {
  getFinanceSummary,
  type FinanceSummary,
} from '@/lib/api/endpoints/finance';
import { UserRole } from '@/types';
import { formatBRLFromCents, formatDateTime } from '@/lib/utils';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function extractApiError(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const msg = (err as { response?: { data?: { message?: string } } }).response
      ?.data?.message;
    if (msg) return msg;
  }
  return 'Erro ao carregar resumo financeiro';
}

function methodLabel(method: string): string {
  const labels: Record<string, string> = {
    PIX: 'PIX',
    CASH: 'Dinheiro',
    CREDIT_CARD: 'Cartão (Crédito)',
    DEBIT_CARD: 'Cartão (Débito)',
    BANK_TRANSFER: 'Transferência',
  };
  return labels[method] || method;
}

export default function FinancePage() {
  const { user } = useAuthStore();
  const role = user?.role as UserRole | undefined;
  const isAdmin = role === UserRole.ADMIN;
  const isReceptionist = role === UserRole.RECEPTIONIST;
  const canFilterDoctor = isAdmin || isReceptionist;
  const showByDoctor = isAdmin;

  const today = useMemo(() => new Date(), []);
  const defaultEnd = toYmd(today);
  const defaultStart = toYmd(new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000));

  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [doctorId, setDoctorId] = useState('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [data, setData] = useState<FinanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const maxSeriesValue = useMemo(() => {
    if (!data) return 0;
    return Math.max(
      0,
      ...data.series.dailyReceived.map((d) => d.cents),
      ...data.series.dailyPending.map((d) => d.cents),
    );
  }, [data]);

  const maxMethodValue = useMemo(() => {
    if (!data) return 0;
    return Math.max(0, ...data.breakdowns.byMethod.map((m) => m.receivedCents));
  }, [data]);

  const maxDoctorValue = useMemo(() => {
    if (!data) return 0;
    return Math.max(0, ...data.breakdowns.byDoctor.map((d) => d.receivedCents));
  }, [data]);

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const summary = await getFinanceSummary({
        start,
        end,
        doctorId: canFilterDoctor ? (doctorId || undefined) : undefined,
        timezone: 'America/Sao_Paulo',
      });
      setData(summary);
    } catch (err: unknown) {
      setError(extractApiError(err));
    } finally {
      setIsLoading(false);
    }
  }, [start, end, doctorId, canFilterDoctor]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (!canFilterDoctor) return;
    getDoctors().then(setDoctors).catch(() => {});
  }, [canFilterDoctor]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Financeiro</h1>
        <p className="text-muted-foreground mt-1">Resumo por pagamentos e recebimentos</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-sm text-muted-foreground">Início</label>
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Fim</label>
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        {canFilterDoctor && (
          <div className="w-64">
            <label className="text-sm text-muted-foreground">Médico(a)</label>
            <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
              <option value="">Todos</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <Button variant="outline" onClick={fetchSummary} disabled={isLoading}>
          Atualizar
        </Button>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {!isLoading && data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              label="Recebido"
              value={formatBRLFromCents(data.kpis.receivedCents)}
              sub={`${data.kpis.paidCount} pagos • data efetiva do pagamento`}
              tooltip="Baseado na data efetiva do pagamento"
              color="bg-emerald-100 text-emerald-700"
            />
            <KpiCard
              label="Pendente"
              value={formatBRLFromCents(data.kpis.pendingCents)}
              sub={`${data.kpis.pendingCount} pendentes • data da consulta`}
              tooltip="Baseado na data da consulta"
              color="bg-amber-100 text-amber-700"
            />
            <KpiCard
              label="Reembolsado"
              value={formatBRLFromCents(data.kpis.refundedCents)}
              sub={`${data.kpis.refundedCount} reembolsos`}
              color="bg-slate-100 text-slate-700"
            />
            <KpiCard
              label="Cancelado"
              value={formatBRLFromCents(data.kpis.cancelledCents)}
              sub={`${data.kpis.cancelledCount} pagamentos`}
              color="bg-red-100 text-red-700"
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="p-4 border rounded-lg bg-card shadow-sm">
              <h3 className="font-semibold mb-3">Recebido por dia</h3>
              <div className="space-y-2 max-h-80 overflow-auto">
                {data.series.dailyReceived.map((item) => {
                  const width = maxSeriesValue > 0 ? Math.max(2, (item.cents / maxSeriesValue) * 100) : 0;
                  return (
                    <div key={item.date} className="grid grid-cols-[90px_1fr_110px] gap-2 items-center">
                      <span className="text-xs text-muted-foreground">{item.date.slice(5)}</span>
                      <div className="h-2 bg-muted rounded">
                        <div className="h-2 bg-emerald-500 rounded" style={{ width: `${width}%` }} />
                      </div>
                      <span className="text-xs text-right">{formatBRLFromCents(item.cents)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-card shadow-sm">
              <h3 className="font-semibold mb-3">Pendente por dia</h3>
              <div className="space-y-2 max-h-80 overflow-auto">
                {data.series.dailyPending.map((item) => {
                  const width = maxSeriesValue > 0 ? Math.max(2, (item.cents / maxSeriesValue) * 100) : 0;
                  return (
                    <div key={item.date} className="grid grid-cols-[90px_1fr_110px] gap-2 items-center">
                      <span className="text-xs text-muted-foreground">{item.date.slice(5)}</span>
                      <div className="h-2 bg-muted rounded">
                        <div className="h-2 bg-amber-500 rounded" style={{ width: `${width}%` }} />
                      </div>
                      <span className="text-xs text-right">{formatBRLFromCents(item.cents)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="p-4 border rounded-lg bg-card shadow-sm">
              <h3 className="font-semibold mb-3">Recebido por método</h3>
              <div className="space-y-2">
                {data.breakdowns.byMethod.map((item) => {
                  const width = maxMethodValue > 0 ? Math.max(2, (item.receivedCents / maxMethodValue) * 100) : 0;
                  return (
                    <div key={item.method} className="grid grid-cols-[160px_1fr_110px] gap-2 items-center">
                      <span className="text-sm">{methodLabel(item.method)}</span>
                      <div className="h-2 bg-muted rounded">
                        <div className="h-2 bg-blue-500 rounded" style={{ width: `${width}%` }} />
                      </div>
                      <span className="text-xs text-right">{formatBRLFromCents(item.receivedCents)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {showByDoctor && (
              <div className="p-4 border rounded-lg bg-card shadow-sm">
                <h3 className="font-semibold mb-3">Recebido por médico(a)</h3>
                <div className="space-y-2">
                  {data.breakdowns.byDoctor.map((item) => {
                    const width = maxDoctorValue > 0 ? Math.max(2, (item.receivedCents / maxDoctorValue) * 100) : 0;
                    return (
                      <div key={item.doctorId} className="grid grid-cols-[160px_1fr_110px] gap-2 items-center">
                        <span className="text-sm truncate">{item.doctorName}</span>
                        <div className="h-2 bg-muted rounded">
                          <div className="h-2 bg-purple-500 rounded" style={{ width: `${width}%` }} />
                        </div>
                        <span className="text-xs text-right">{formatBRLFromCents(item.receivedCents)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border rounded-lg bg-card shadow-sm">
            <h3 className="font-semibold mb-3">Top pendentes</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-3 py-2">Data/Hora</th>
                    <th className="text-left px-3 py-2">Paciente</th>
                    <th className="text-left px-3 py-2">Médico(a)</th>
                    <th className="text-left px-3 py-2">Valor</th>
                    <th className="text-left px-3 py-2">Método</th>
                    <th className="text-right px-3 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topPending.map((row) => (
                    <tr key={row.payment.id} className="border-b last:border-0">
                      <td className="px-3 py-2">{formatDateTime(row.startTime)}</td>
                      <td className="px-3 py-2">{row.patient.name}</td>
                      <td className="px-3 py-2">{row.doctor.name}</td>
                      <td className="px-3 py-2">{formatBRLFromCents(row.payment.amount)}</td>
                      <td className="px-3 py-2">{methodLabel(row.payment.method)}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-2">
                          <Link
                            href={`/dashboard/appointments/${row.appointmentId}`}
                            className="text-primary hover:underline"
                          >
                            Abrir
                          </Link>
                          <Link
                            href={`/dashboard/patients/${row.patient.id}/history`}
                            className="text-muted-foreground hover:underline"
                          >
                            Histórico
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data.topPending.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>
                        Sem pendências no período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  tooltip,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  tooltip?: string;
  color: string;
}) {
  return (
    <div className={`rounded-lg px-4 py-3 ${color}`} title={tooltip}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs opacity-80 mt-1">{sub}</p>
    </div>
  );
}
