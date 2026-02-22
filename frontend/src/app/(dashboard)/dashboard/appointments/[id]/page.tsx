'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppointmentStore } from '@/lib/stores/appointment-store';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { ConfirmActionModal } from '@/components/ui/confirm-action-modal';
import { AppointmentStatusBadge } from '@/components/appointments/appointment-status-badge';
import { AppointmentStatusActions } from '@/components/appointments/appointment-status-actions';
import { EncounterSection } from '@/components/appointments/encounter-section';
import { getApiErrorMessage } from '@/lib/api/error-utils';
import {
  cancelPayment,
  createAppointmentPayment,
  getAppointmentPayment,
  markPaymentPaid,
  refundPayment,
  updatePayment,
} from '@/lib/api/endpoints/payments';
import { useAuthStore } from '@/lib/stores/auth-store';
import { PaymentMethod, PaymentStatus, UserRole, type Payment } from '@/types';
import {
  formatDate,
  formatDateTime,
  formatTime,
  formatPhone,
  getTodayYmdInSaoPaulo,
} from '@/lib/utils';
import { ArrowLeft, Pencil, Clock, User, Stethoscope, FileText } from 'lucide-react';

export default function AppointmentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { currentAppointment, fetchAppointment, isLoading, error } = useAppointmentStore();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentAction, setPaymentAction] = useState<string | null>(null);
  const [markPaidModalOpen, setMarkPaidModalOpen] = useState(false);
  const [markPaidModalError, setMarkPaidModalError] = useState<string | null>(null);
  const [markPaidModalLoading, setMarkPaidModalLoading] = useState(false);
  const [markPaidDate, setMarkPaidDate] = useState(() => getTodayYmdInSaoPaulo());
  const [amountInput, setAmountInput] = useState('');
  const [methodInput, setMethodInput] = useState<PaymentMethod>(PaymentMethod.PIX);
  const [notesInput, setNotesInput] = useState('');

  useEffect(() => {
    fetchAppointment(params.id);
  }, [params.id, fetchAppointment]);

  async function fetchPayment() {
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const result = await getAppointmentPayment(params.id);
      setPayment(result);
      if (!result) {
        setAmountInput('');
        setMethodInput(PaymentMethod.PIX);
        setNotesInput('');
      }
    } catch (err: unknown) {
      setPaymentError(extractApiError(err));
    } finally {
      setPaymentLoading(false);
    }
  }

  useEffect(() => {
    // fetchPayment depends on route param only in this page lifecycle
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchPayment();
  }, [params.id]);

  useEffect(() => {
    if (!payment) return;
    setAmountInput(formatInputFromCents(payment.amount));
    setMethodInput(payment.method);
    setNotesInput(payment.notes || '');
  }, [payment]);

  const runPaymentAction = async (actionKey: string, action: () => Promise<unknown>) => {
    setPaymentAction(actionKey);
    setPaymentError(null);
    try {
      await action();
      await fetchPayment();
    } catch (err: unknown) {
      setPaymentError(extractApiError(err));
    } finally {
      setPaymentAction(null);
    }
  };

  const createPaymentAction = async () => {
    const amount = parseBRLToCents(amountInput);
    if (!amount || amount < 1) {
      setPaymentError('Informe um valor válido maior que R$ 0,00');
      return;
    }

    await runPaymentAction('create', () =>
      createAppointmentPayment(params.id, {
        amount,
        method: methodInput,
        notes: notesInput || undefined,
      }),
    );
  };

  const updatePaymentAction = async () => {
    if (!payment) return;
    const amount = parseBRLToCents(amountInput);
    if (!amount || amount < 1) {
      setPaymentError('Informe um valor válido maior que R$ 0,00');
      return;
    }

    await runPaymentAction('save', () =>
      updatePayment(payment.id, {
        amount,
        method: methodInput,
        notes: notesInput || undefined,
      }),
    );
  };

  const openMarkPaidModal = () => {
    setMarkPaidModalError(null);
    setMarkPaidDate(getTodayYmdInSaoPaulo());
    setMarkPaidModalOpen(true);
  };

  const closeMarkPaidModal = () => {
    if (markPaidModalLoading) return;
    setMarkPaidModalError(null);
    setMarkPaidModalOpen(false);
  };

  const confirmMarkPaid = async () => {
    if (!payment) return;
    setMarkPaidModalError(null);
    setMarkPaidModalLoading(true);
    try {
      await markPaymentPaid(payment.id, { paidDate: markPaidDate });
      await fetchPayment();
      setMarkPaidModalOpen(false);
    } catch (err: unknown) {
      setMarkPaidModalError(getApiErrorMessage(err, 'Erro ao marcar pagamento como pago'));
    } finally {
      setMarkPaidModalLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
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

  const canEdit =
    currentAppointment.status === 'SCHEDULED' || currentAppointment.status === 'CONFIRMED';
  const isReceptionist = user?.role === UserRole.RECEPTIONIST;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/appointments')}
            title="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-primary">
                {currentAppointment.type}
              </h1>
              <AppointmentStatusBadge status={currentAppointment.status} />
            </div>
            <p className="text-muted-foreground mt-1">
              {formatDate(currentAppointment.scheduledDate)} às{' '}
              {formatTime(currentAppointment.scheduledDate)}
            </p>
          </div>
        </div>

        {canEdit && (
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/appointments/${params.id}/edit`)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
        )}
      </div>

      {/* Detail Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Patient Info */}
        <div className="p-6 border rounded-lg bg-card shadow-sm">
          <h3 className="font-semibold text-lg mb-4 pb-2 border-b flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Paciente
          </h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Nome:</span>
              <p className="font-medium">{currentAppointment.patient.name}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Telefone:</span>
              <p className="font-medium">
                {formatPhone(currentAppointment.patient.phone)}
              </p>
            </div>
          </div>
        </div>

        {/* Appointment Info */}
        <div className="p-6 border rounded-lg bg-card shadow-sm">
          <h3 className="font-semibold text-lg mb-4 pb-2 border-b flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Detalhes da Consulta
          </h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Data e Hora:</span>
              <p className="font-medium">
                {formatDate(currentAppointment.scheduledDate)} às{' '}
                {formatTime(currentAppointment.scheduledDate)}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Duração:</span>
              <p className="font-medium">{currentAppointment.duration} minutos</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Tipo:</span>
              <p className="font-medium">{currentAppointment.type}</p>
            </div>
          </div>
        </div>

        {/* Doctor Info */}
        <div className="p-6 border rounded-lg bg-card shadow-sm">
          <h3 className="font-semibold text-lg mb-4 pb-2 border-b flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Médico(a)
          </h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Nome:</span>
              <p className="font-medium">{currentAppointment.doctor.name}</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {currentAppointment.notes && (
          <div className="p-6 border rounded-lg bg-card shadow-sm">
            <h3 className="font-semibold text-lg mb-4 pb-2 border-b flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Observações
            </h3>
            <p className="text-sm">{currentAppointment.notes}</p>
          </div>
        )}
      </div>

      {/* Encounter / SOAP Medical Record */}
      {isReceptionist ? (
        <div className="p-6 border rounded-lg bg-card shadow-sm space-y-3">
          <Alert variant="destructive">Sem permissão para acessar este recurso.</Alert>
          <Button variant="outline" onClick={() => router.back()}>
            Voltar
          </Button>
        </div>
      ) : (
        <EncounterSection appointment={currentAppointment} />
      )}

      {/* Payment */} 
      <div className="p-6 border rounded-lg bg-card shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-lg">Pagamento</h3>
          {payment && (
            <PaymentStatusChip status={payment.status} />
          )}
        </div>

        {(paymentLoading || paymentAction === 'create' || paymentAction === 'save') && (
          <Skeleton className="h-20 w-full" />
        )}

        {paymentError && <Alert variant="destructive">{paymentError}</Alert>}

        {!paymentLoading && !payment && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="payment-amount">Valor (R$)</Label>
                <Input
                  id="payment-amount"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="150,00"
                  disabled={!!paymentAction}
                />
              </div>
              <div>
                <Label htmlFor="payment-method">Método</Label>
                <Select
                  id="payment-method"
                  value={methodInput}
                  onChange={(e) => setMethodInput(e.target.value as PaymentMethod)}
                  disabled={!!paymentAction}
                >
                  {PAYMENT_METHOD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="payment-notes">Observações</Label>
              <Input
                id="payment-notes"
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="Opcional"
                disabled={!!paymentAction}
              />
            </div>
            <Button onClick={createPaymentAction} disabled={!!paymentAction}>
              Criar pagamento
            </Button>
          </div>
        )}

        {!paymentLoading && payment && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Valor:</span>
                <p className="font-medium">{formatBRLFromCents(payment.amount)}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Método:</span>
                <p className="font-medium">{PAYMENT_METHOD_LABELS[payment.method] || payment.method}</p>
              </div>
              {payment.paidAt && (
                <div>
                  <span className="text-sm text-muted-foreground">Pago em:</span>
                  <p className="font-medium">
                    {new Date(payment.paidAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              )}
              {payment.refundedAt && (
                <div>
                  <span className="text-sm text-muted-foreground">Reembolsado em:</span>
                  <p className="font-medium">
                    {new Date(payment.refundedAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              )}
            </div>
            {payment.notes && (
              <div>
                <span className="text-sm text-muted-foreground">Observações:</span>
                <p className="text-sm">{payment.notes}</p>
              </div>
            )}

            {payment.status === 'PENDING' && (
              <div className="space-y-4 pt-2 border-t">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="payment-edit-amount">Valor (R$)</Label>
                    <Input
                      id="payment-edit-amount"
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      disabled={!!paymentAction}
                    />
                  </div>
                  <div>
                    <Label htmlFor="payment-edit-method">Método</Label>
                    <Select
                      id="payment-edit-method"
                      value={methodInput}
                      onChange={(e) => setMethodInput(e.target.value as PaymentMethod)}
                      disabled={!!paymentAction}
                    >
                      {PAYMENT_METHOD_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="payment-edit-notes">Observações</Label>
                  <Input
                    id="payment-edit-notes"
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    disabled={!!paymentAction}
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button onClick={updatePaymentAction} disabled={!!paymentAction}>
                    Salvar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={openMarkPaidModal}
                    disabled={!!paymentAction || markPaidModalLoading}
                  >
                    Marcar como pago
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => runPaymentAction('cancel', () => cancelPayment(payment.id))}
                    disabled={!!paymentAction}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {payment.status === 'PAID' && (
              <Button
                variant="outline"
                onClick={() => runPaymentAction('refund', () => refundPayment(payment.id))}
                disabled={!!paymentAction}
              >
                Reembolsar
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Status Actions */}
      <div className="p-6 border rounded-lg bg-card shadow-sm">
        <AppointmentStatusActions
          appointmentId={currentAppointment.id}
          currentStatus={currentAppointment.status}
        />
      </div>

      <ConfirmActionModal
        open={markPaidModalOpen}
        title="Confirmar recebimento"
        description="Confirme antes de marcar como pago."
        details={[
          {
            label: 'Paciente',
            value: currentAppointment.patient.phone
              ? `${currentAppointment.patient.name} (${formatPhone(currentAppointment.patient.phone)})`
              : currentAppointment.patient.name,
          },
          { label: 'Consulta', value: formatDateTime(currentAppointment.scheduledDate) },
          { label: 'Médico', value: currentAppointment.doctor.name },
          { label: 'Valor', value: formatBRLFromCents(payment?.amount || 0) },
          {
            label: 'Método',
            value: payment ? PAYMENT_METHOD_LABELS[payment.method] || payment.method : '-',
          },
        ]}
        content={
          <div className="space-y-2">
            <label htmlFor="appointment-mark-paid-date" className="text-sm text-muted-foreground">
              Data do pagamento
            </label>
            <Input
              id="appointment-mark-paid-date"
              type="date"
              value={markPaidDate}
              onChange={(e) => setMarkPaidDate(e.target.value)}
              disabled={markPaidModalLoading}
            />
          </div>
        }
        confirmText="Confirmar pagamento"
        isLoading={markPaidModalLoading}
        error={markPaidModalError}
        onConfirm={confirmMarkPaid}
        onClose={closeMarkPaidModal}
      />
    </div>
  );
}

const PAYMENT_METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: PaymentMethod.PIX, label: 'PIX' },
  { value: PaymentMethod.CASH, label: 'Dinheiro' },
  { value: PaymentMethod.CREDIT_CARD, label: 'Cartão (Crédito)' },
  { value: PaymentMethod.DEBIT_CARD, label: 'Cartão (Débito)' },
  { value: PaymentMethod.BANK_TRANSFER, label: 'Transferência' },
];

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.PIX]: 'PIX',
  [PaymentMethod.CASH]: 'Dinheiro',
  [PaymentMethod.CREDIT_CARD]: 'Cartão (Crédito)',
  [PaymentMethod.DEBIT_CARD]: 'Cartão (Débito)',
  [PaymentMethod.BANK_TRANSFER]: 'Transferência',
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
};

function PaymentStatusChip({ status }: { status: PaymentStatus }) {
  const styles: Record<PaymentStatus, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    PAID: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
    REFUNDED: 'bg-slate-100 text-slate-700',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}

function formatBRLFromCents(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

function formatInputFromCents(cents: number): string {
  const value = (cents / 100).toFixed(2);
  return value.replace('.', ',');
}

function parseBRLToCents(input: string): number | null {
  const raw = input.replace(/\s|R\$/gi, '').trim();
  if (!raw) return null;

  const sanitized = raw.replace(/[^\d,.-]/g, '');
  if (!sanitized) return null;

  const lastComma = sanitized.lastIndexOf(',');
  const lastDot = sanitized.lastIndexOf('.');
  const decimalIndex = Math.max(lastComma, lastDot);

  if (decimalIndex === -1) {
    const integer = sanitized.replace(/\D/g, '');
    if (!integer) return null;
    return Number.parseInt(integer, 10) * 100;
  }

  const intPart = sanitized.slice(0, decimalIndex).replace(/\D/g, '') || '0';
  const fracPart = sanitized
    .slice(decimalIndex + 1)
    .replace(/\D/g, '')
    .padEnd(2, '0')
    .slice(0, 2);

  return Number.parseInt(intPart, 10) * 100 + Number.parseInt(fracPart || '0', 10);
}

function extractApiError(err: unknown): string {
  return getApiErrorMessage(err, 'Erro ao processar pagamento');
}
