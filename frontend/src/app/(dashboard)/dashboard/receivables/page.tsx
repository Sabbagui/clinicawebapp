'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/auth-store';
import { getDoctors, type Doctor } from '@/lib/api/endpoints/users';
import {
  getFinanceReceivables,
  type FinanceReceivablesResponse,
} from '@/lib/api/endpoints/finance';
import { markPaymentPaid } from '@/lib/api/endpoints/payments';
import { getApiErrorMessage } from '@/lib/api/error-utils';
import { PaymentMethod, UserRole } from '@/types';
import {
  formatBRLFromCents,
  formatDateTime,
  formatPhone,
  getTodayYmdInSaoPaulo,
} from '@/lib/utils';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ConfirmActionModal } from '@/components/ui/confirm-action-modal';

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function methodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    [PaymentMethod.PIX]: 'PIX',
    [PaymentMethod.CASH]: 'Dinheiro',
    [PaymentMethod.CREDIT_CARD]: 'Cartão (Crédito)',
    [PaymentMethod.DEBIT_CARD]: 'Cartão (Débito)',
    [PaymentMethod.BANK_TRANSFER]: 'Transferência',
  };
  return labels[method];
}

export default function ReceivablesPage() {
  const { user } = useAuthStore();
  const role = user?.role as UserRole | undefined;
  const isAdmin = role === UserRole.ADMIN;
  const isReceptionist = role === UserRole.RECEPTIONIST;
  const canFilterDoctor = isAdmin || isReceptionist;

  const today = useMemo(() => new Date(), []);
  const defaultEnd = toYmd(today);
  const defaultStart = toYmd(new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000));

  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [doctorId, setDoctorId] = useState('');
  const [method, setMethod] = useState('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [data, setData] = useState<FinanceReceivablesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowLoading, setRowLoading] = useState<string | null>(null);
  const [confirmingRow, setConfirmingRow] = useState<FinanceReceivablesResponse['rows'][number] | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [markPaidDate, setMarkPaidDate] = useState(() => getTodayYmdInSaoPaulo());

  const fetchReceivables = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getFinanceReceivables({
        start,
        end,
        doctorId: canFilterDoctor ? doctorId || undefined : undefined,
        method: method ? (method as PaymentMethod) : undefined,
        timezone: 'America/Sao_Paulo',
        limit: 50,
        offset: 0,
      });
      setData(result);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Erro ao carregar cobranças'));
    } finally {
      setIsLoading(false);
    }
  }, [start, end, doctorId, method, canFilterDoctor]);

  useEffect(() => {
    fetchReceivables();
  }, [fetchReceivables]);

  useEffect(() => {
    if (!canFilterDoctor) return;
    getDoctors().then(setDoctors).catch(() => {});
  }, [canFilterDoctor]);

  const openMarkPaidModal = (row: FinanceReceivablesResponse['rows'][number]) => {
    setModalError(null);
    setMarkPaidDate(getTodayYmdInSaoPaulo());
    setConfirmingRow(row);
  };

  const closeMarkPaidModal = () => {
    if (rowLoading) return;
    setModalError(null);
    setConfirmingRow(null);
  };

  const confirmMarkPaid = async () => {
    if (!confirmingRow) return;
    setModalError(null);
    const paymentId = confirmingRow.payment.id;
    setRowLoading(paymentId);
    try {
      await markPaymentPaid(paymentId, { paidDate: markPaidDate });
      await fetchReceivables();
      setModalError(null);
      setConfirmingRow(null);
    } catch (err: unknown) {
      setModalError(getApiErrorMessage(err, 'Erro ao marcar pagamento como pago'));
    } finally {
      setRowLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Cobranças</h1>
        <p className="text-muted-foreground mt-1">Pagamentos pendentes e envelhecimento</p>
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
        <div className="w-56">
          <label className="text-sm text-muted-foreground">Método</label>
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="">Todos</option>
            <option value={PaymentMethod.PIX}>PIX</option>
            <option value={PaymentMethod.CASH}>Dinheiro</option>
            <option value={PaymentMethod.CREDIT_CARD}>Cartão (Crédito)</option>
            <option value={PaymentMethod.DEBIT_CARD}>Cartão (Débito)</option>
            <option value={PaymentMethod.BANK_TRANSFER}>Transferência</option>
          </Select>
        </div>
        <Button variant="outline" onClick={fetchReceivables} disabled={isLoading}>
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KpiCard
              label="Total pendente"
              value={formatBRLFromCents(data.kpis.pendingCents)}
              sub={`${data.kpis.pendingCount} cobranças`}
              color="bg-amber-100 text-amber-700"
            />
            <KpiCard
              label="0-7 dias"
              value={formatBRLFromCents(data.kpis.buckets.d0_7.cents)}
              sub={`${data.kpis.buckets.d0_7.count} itens`}
              color="bg-emerald-100 text-emerald-700"
            />
            <KpiCard
              label="8-15 dias"
              value={formatBRLFromCents(data.kpis.buckets.d8_15.cents)}
              sub={`${data.kpis.buckets.d8_15.count} itens`}
              color="bg-yellow-100 text-yellow-700"
            />
            <KpiCard
              label="16-30 dias"
              value={formatBRLFromCents(data.kpis.buckets.d16_30.cents)}
              sub={`${data.kpis.buckets.d16_30.count} itens`}
              color="bg-orange-100 text-orange-700"
            />
            <KpiCard
              label="31+ dias"
              value={formatBRLFromCents(data.kpis.buckets.d31p.cents)}
              sub={`${data.kpis.buckets.d31p.count} itens`}
              color="bg-red-100 text-red-700"
            />
          </div>

          <div className="p-4 border rounded-lg bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-3 py-2">Idade</th>
                    <th className="text-left px-3 py-2">Data/Hora</th>
                    <th className="text-left px-3 py-2">Paciente</th>
                    <th className="text-left px-3 py-2">Médico(a)</th>
                    <th className="text-left px-3 py-2">Valor</th>
                    <th className="text-right px-3 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.payment.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{row.ageDays}d</td>
                      <td className="px-3 py-2">{formatDateTime(row.appointment.startTime)}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{row.patient.name}</div>
                        {row.patient.phone && (
                          <div className="text-xs text-muted-foreground">{formatPhone(row.patient.phone)}</div>
                        )}
                      </td>
                      <td className="px-3 py-2">{row.doctor.name}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{formatBRLFromCents(row.payment.amount)}</div>
                        <div className="text-xs text-muted-foreground">{methodLabel(row.payment.method)}</div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => openMarkPaidModal(row)}
                            disabled={rowLoading === row.payment.id}
                          >
                            {rowLoading === row.payment.id ? 'Marcando...' : 'Marcar como pago'}
                          </Button>
                          <Link
                            href={`/dashboard/appointments/${row.appointment.id}`}
                            className="text-primary hover:underline"
                          >
                            Abrir consulta
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data.rows.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>
                        Nenhuma cobrança pendente no período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <ConfirmActionModal
        open={!!confirmingRow}
        title="Confirmar recebimento"
        description="Confirme antes de marcar como pago."
        details={
          confirmingRow
            ? [
                {
                  label: 'Paciente',
                  value: confirmingRow.patient.phone
                    ? `${confirmingRow.patient.name} (${formatPhone(confirmingRow.patient.phone)})`
                    : confirmingRow.patient.name,
                },
                { label: 'Consulta', value: formatDateTime(confirmingRow.appointment.startTime) },
                { label: 'Médico', value: confirmingRow.doctor.name },
                { label: 'Valor', value: formatBRLFromCents(confirmingRow.payment.amount) },
                { label: 'Método', value: methodLabel(confirmingRow.payment.method) },
              ]
            : []
        }
        content={
          <div className="space-y-2">
            <label htmlFor="receivable-mark-paid-date" className="text-sm text-muted-foreground">
              Data do pagamento
            </label>
            <Input
              id="receivable-mark-paid-date"
              type="date"
              value={markPaidDate}
              onChange={(e) => setMarkPaidDate(e.target.value)}
              disabled={!!rowLoading}
            />
          </div>
        }
        confirmText="Marcar como pago"
        isLoading={!!rowLoading}
        error={modalError}
        onConfirm={confirmMarkPaid}
        onClose={closeMarkPaidModal}
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className={`rounded-lg px-4 py-3 ${color}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs opacity-80 mt-1">{sub}</p>
    </div>
  );
}
