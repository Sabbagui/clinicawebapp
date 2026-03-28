'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, FileText, Settings } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { getDoctors, type Doctor } from '@/lib/api/endpoints/users';
import {
  getFinanceSummary,
  type FinanceSummary,
} from '@/lib/api/endpoints/finance';
import {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  uploadExpenseReceipt,
  extractExpenseReceipt,
} from '@/lib/api/endpoints/expenses';
import {
  listExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
} from '@/lib/api/endpoints/expense-categories';
import { UserRole, type Expense, type ExpenseCategory } from '@/types';
import { formatBRLFromCents, formatDateTime } from '@/lib/utils';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

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

function formatDateBR(dateStr: string): string {
  const d = dateStr.split('T')[0];
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export default function FinancePage() {
  const { user } = useAuthStore();
  const role = user?.role as UserRole | undefined;
  const isAdmin = role === UserRole.ADMIN;
  const isReceptionist = role === UserRole.RECEPTIONIST;
  const canFilterDoctor = isAdmin || isReceptionist;
  const showByDoctor = isAdmin;
  const canManageExpenses = isAdmin || isReceptionist;

  const today = useMemo(() => new Date(), []);
  const defaultEnd = toYmd(today);
  const defaultStart = toYmd(new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000));

  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  // Alias for expense fetch
  const startDate = start;
  const endDate = end;

  const [doctorId, setDoctorId] = useState('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [data, setData] = useState<FinanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'receitas' | 'despesas'>('receitas');

  // Expense list state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [expensePage, setExpensePage] = useState(0);
  const EXPENSES_PER_PAGE = 20;

  // Categories state
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // Expense form state
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amountBRL: '',
    categoryId: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [expenseFile, setExpenseFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractionBanner, setExtractionBanner] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [expenseFormError, setExpenseFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const maxExpenseCategoryValue = useMemo(() => {
    if (!data) return 0;
    const cats = data.breakdowns.byExpenseCategory ?? [];
    return Math.max(0, ...cats.map((c) => c.totalCents));
  }, [data]);

  const fetchCategories = useCallback(() => {
    listExpenseCategories(true).then(setCategories).catch(() => {});
  }, []);

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

  const fetchExpenses = useCallback(async () => {
    if (!canManageExpenses) return;
    setExpensesLoading(true);
    try {
      const result = await listExpenses({
        start: startDate,
        end: endDate,
        limit: EXPENSES_PER_PAGE,
        offset: expensePage * EXPENSES_PER_PAGE,
      });
      setExpenses(result.data);
      setExpensesTotal(result.total);
    } catch {
      // silent
    } finally {
      setExpensesLoading(false);
    }
  }, [startDate, endDate, expensePage, canManageExpenses]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (!canFilterDoctor) return;
    getDoctors().then(setDoctors).catch(() => {});
  }, [canFilterDoctor]);

  useEffect(() => {
    if (activeTab === 'despesas') {
      fetchExpenses();
    }
  }, [activeTab, fetchExpenses]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleReceiptFileChange = async (file: File) => {
    setExpenseFile(file);
    setExtracting(true);
    setExtractionBanner(false);
    try {
      const extracted = await extractExpenseReceipt(file);
      if (extracted.amountCents || extracted.date || extracted.description) {
        setExpenseForm(prev => ({
          ...prev,
          amountBRL: extracted.amountCents ? (extracted.amountCents / 100).toFixed(2) : prev.amountBRL,
          date: extracted.date || prev.date,
          description: extracted.description || prev.description,
        }));
        setExtractionBanner(true);
      }
    } catch {
      // silent - user fills manually
    } finally {
      setExtracting(false);
    }
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      description: '',
      amountBRL: '',
      categoryId: categories.length > 0 ? categories[0].id : '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  const handleSaveExpense = async () => {
    setExpenseFormError(null);
    setSavingExpense(true);
    try {
      const amountCents = Math.round(parseFloat(expenseForm.amountBRL.replace(',', '.')) * 100);
      const payload = {
        description: expenseForm.description,
        amount: amountCents,
        categoryId: expenseForm.categoryId,
        date: expenseForm.date,
        notes: expenseForm.notes || undefined,
      };
      let saved: Expense;
      if (editingExpense) {
        saved = await updateExpense(editingExpense.id, payload);
      } else {
        saved = await createExpense(payload);
      }
      if (expenseFile && !editingExpense) {
        await uploadExpenseReceipt(saved.id, expenseFile);
      } else if (expenseFile && editingExpense) {
        await uploadExpenseReceipt(editingExpense.id, expenseFile);
      }
      setShowExpenseForm(false);
      setEditingExpense(null);
      setExpenseFile(null);
      setExtractionBanner(false);
      resetExpenseForm();
      await fetchExpenses();
      await fetchSummary();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Erro ao salvar despesa')
          : 'Erro ao salvar despesa';
      setExpenseFormError(msg);
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Confirmar exclusão da despesa?')) return;
    try {
      await deleteExpense(id);
      await fetchExpenses();
      await fetchSummary();
    } catch {
      // silent
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      description: expense.description,
      amountBRL: (expense.amount / 100).toFixed(2),
      categoryId: expense.categoryId,
      date: expense.date.split('T')[0],
      notes: expense.notes || '',
    });
    setExpenseFile(null);
    setExtractionBanner(false);
    setExpenseFormError(null);
    setShowExpenseForm(true);
  };

  const handleOpenNewExpenseForm = () => {
    setEditingExpense(null);
    resetExpenseForm();
    setExpenseFile(null);
    setExtractionBanner(false);
    setExpenseFormError(null);
    setShowExpenseForm(true);
  };

  const totalPages = Math.ceil(expensesTotal / EXPENSES_PER_PAGE);

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

      {/* Tab switcher */}
      <div className="flex border-b mb-4">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'receitas' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
          onClick={() => setActiveTab('receitas')}
        >
          Receitas
        </button>
        {canManageExpenses && (
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'despesas' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
            onClick={() => setActiveTab('despesas')}
          >
            Despesas
          </button>
        )}
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
          {/* KPI row — always visible regardless of tab */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard
              label="Recebido"
              value={formatBRLFromCents(data.kpis.receivedCents)}
              sub={`${data.kpis.paidCount} pagos • data efetiva do pagamento`}
              tooltip="Baseado na data efetiva do pagamento"
              color="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
            />
            <KpiCard
              label="Pendente"
              value={formatBRLFromCents(data.kpis.pendingCents)}
              sub={`${data.kpis.pendingCount} pendentes • data da consulta`}
              tooltip="Baseado na data da consulta"
              color="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
            />
            <KpiCard
              label="Reembolsado"
              value={formatBRLFromCents(data.kpis.refundedCents)}
              sub={`${data.kpis.refundedCount} reembolsos`}
              color="bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300"
            />
            <KpiCard
              label="Cancelado"
              value={formatBRLFromCents(data.kpis.cancelledCents)}
              sub={`${data.kpis.cancelledCount} pagamentos`}
              color="bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300"
            />
            {canManageExpenses && (
              <>
                <KpiCard
                  label="Despesas"
                  value={formatBRLFromCents(data.kpis.expensesTotalCents ?? 0)}
                  sub={`${data.kpis.expensesCount ?? 0} despesas`}
                  color="bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300"
                />
                <KpiCard
                  label="Resultado"
                  value={formatBRLFromCents(data.kpis.profitCents ?? 0)}
                  sub="Recebido − Despesas"
                  color={
                    (data.kpis.profitCents ?? 0) >= 0
                      ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300'
                      : 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                  }
                />
              </>
            )}
          </div>

          {/* Receitas tab */}
          {activeTab === 'receitas' && (
            <>
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

          {/* Despesas tab */}
          {activeTab === 'despesas' && canManageExpenses && (
            <div className="space-y-6">
              {/* Expense category breakdown */}
              {(data.breakdowns.byExpenseCategory ?? []).length > 0 && (
                <div className="p-4 border rounded-lg bg-card shadow-sm">
                  <h3 className="font-semibold mb-3">Despesas por Categoria</h3>
                  <div className="space-y-2">
                    {(data.breakdowns.byExpenseCategory ?? []).map((item) => {
                      const width = maxExpenseCategoryValue > 0
                        ? Math.max(2, (item.totalCents / maxExpenseCategoryValue) * 100)
                        : 0;
                      return (
                        <div key={item.categoryId} className="grid grid-cols-[160px_1fr_110px_60px] gap-2 items-center">
                          <span className="text-sm">{item.category}</span>
                          <div className="h-2 bg-muted rounded">
                            <div className="h-2 bg-orange-500 rounded" style={{ width: `${width}%` }} />
                          </div>
                          <span className="text-xs text-right">{formatBRLFromCents(item.totalCents)}</span>
                          <span className="text-xs text-muted-foreground text-right">{item.count}x</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Category manager button for ADMIN */}
              {isAdmin && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCategoryManager(true)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Gerenciar Categorias
                  </Button>
                </div>
              )}

              {/* Expense list */}
              <div className="p-4 border rounded-lg bg-card shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Despesas</h3>
                  <Button size="sm" onClick={handleOpenNewExpenseForm}>
                    <Plus className="h-4 w-4 mr-1" />
                    Nova Despesa
                  </Button>
                </div>

                {expensesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left px-3 py-2">Data</th>
                          <th className="text-left px-3 py-2">Descrição</th>
                          <th className="text-left px-3 py-2">Categoria</th>
                          <th className="text-right px-3 py-2">Valor</th>
                          <th className="text-center px-3 py-2">Comprovante</th>
                          <th className="text-right px-3 py-2">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.map((expense) => (
                          <tr key={expense.id} className="border-b last:border-0">
                            <td className="px-3 py-2 whitespace-nowrap">{formatDateBR(expense.date)}</td>
                            <td className="px-3 py-2">{expense.description}</td>
                            <td className="px-3 py-2">{expense.category?.label ?? expense.categoryId}</td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">{formatBRLFromCents(expense.amount)}</td>
                            <td className="px-3 py-2 text-center">
                              {expense.receiptPath ? (
                                <a
                                  href={expense.receiptPath}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center text-primary hover:text-primary/80"
                                  title="Ver comprovante"
                                >
                                  <FileText className="h-4 w-4" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="inline-flex gap-2">
                                <button
                                  onClick={() => handleEditExpense(expense)}
                                  className="text-muted-foreground hover:text-primary"
                                  title="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteExpense(expense.id)}
                                  className="text-muted-foreground hover:text-destructive"
                                  title="Excluir"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {expenses.length === 0 && (
                          <tr>
                            <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>
                              Nenhuma despesa no período.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpensePage((p) => Math.max(0, p - 1))}
                      disabled={expensePage === 0}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Página {expensePage + 1} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpensePage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={expensePage >= totalPages - 1}
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Expense form dialog */}
      <Dialog
        open={showExpenseForm}
        onClose={() => {
          setShowExpenseForm(false);
          setEditingExpense(null);
          setExpenseFile(null);
          setExtractionBanner(false);
          setExpenseFormError(null);
          resetExpenseForm();
        }}
        title={editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
      >
        <div className="space-y-4">
          {expenseFormError && (
            <Alert variant="destructive">{expenseFormError}</Alert>
          )}

          <div>
            <label className="text-sm font-medium">Descrição *</label>
            <Input
              value={expenseForm.description}
              onChange={(e) => setExpenseForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Ex: Aluguel do consultório"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Valor *</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">R$</span>
              <Input
                type="text"
                value={expenseForm.amountBRL}
                onChange={(e) => setExpenseForm((prev) => ({ ...prev, amountBRL: e.target.value }))}
                placeholder="0,00"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Categoria *</label>
            <Select
              value={expenseForm.categoryId}
              onChange={(e) =>
                setExpenseForm((prev) => ({ ...prev, categoryId: e.target.value }))
              }
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Data *</label>
            <Input
              type="date"
              value={expenseForm.date}
              onChange={(e) => setExpenseForm((prev) => ({ ...prev, date: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Notas</label>
            <textarea
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] resize-none"
              value={expenseForm.notes}
              onChange={(e) => setExpenseForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Observações opcionais"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Comprovante</label>
            <div className="mt-1 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleReceiptFileChange(file);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={extracting}
              >
                {extracting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Extraindo dados...
                  </span>
                ) : (
                  'Selecionar comprovante (opcional)'
                )}
              </Button>
              {expenseFile && (
                <p className="text-xs text-muted-foreground">{expenseFile.name}</p>
              )}
              {extractionBanner && (
                <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
                  Dados extraídos automaticamente. Verifique antes de salvar.
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowExpenseForm(false);
                setEditingExpense(null);
                setExpenseFile(null);
                setExtractionBanner(false);
                setExpenseFormError(null);
                resetExpenseForm();
              }}
              disabled={savingExpense}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveExpense}
              disabled={savingExpense || !expenseForm.description || !expenseForm.amountBRL || !expenseForm.date || !expenseForm.categoryId}
              className="flex-1"
            >
              {savingExpense ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Category manager dialog (ADMIN only) */}
      {isAdmin && (
        <CategoryManagerDialog
          open={showCategoryManager}
          onClose={() => {
            setShowCategoryManager(false);
            fetchCategories();
          }}
        />
      )}
    </div>
  );
}

function CategoryManagerDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listExpenseCategories(false);
      setCategories(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      load();
      setNewName('');
      setNewLabel('');
      setError(null);
      setEditingId(null);
    }
  }, [open, load]);

  const handleCreate = async () => {
    if (!newName.trim() || !newLabel.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await createExpenseCategory({ name: newName.trim().toUpperCase(), label: newLabel.trim() });
      setNewName('');
      setNewLabel('');
      await load();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Erro ao criar categoria')
          : 'Erro ao criar categoria';
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (cat: ExpenseCategory) => {
    try {
      await updateExpenseCategory(cat.id, { isActive: !cat.isActive });
      await load();
    } catch {
      // silent
    }
  };

  const handleSaveLabel = async (id: string) => {
    if (!editLabel.trim()) return;
    try {
      await updateExpenseCategory(id, { label: editLabel.trim() });
      setEditingId(null);
      await load();
    } catch {
      // silent
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta categoria?')) return;
    setError(null);
    try {
      await deleteExpenseCategory(id);
      await load();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Erro ao remover categoria')
          : 'Erro ao remover categoria';
      setError(msg);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Gerenciar Categorias de Despesa">
      <div className="space-y-4">
        {error && <Alert variant="destructive">{error}</Alert>}

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-auto">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2 border rounded p-2">
                <div className="flex-1 min-w-0">
                  {editingId === cat.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="h-7 text-sm"
                      />
                      <Button size="sm" onClick={() => handleSaveLabel(cat.id)}>
                        Salvar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{cat.label}</span>
                      <span className="text-xs text-muted-foreground">({cat.name})</span>
                      {cat.isDefault && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">padrão</span>
                      )}
                      {!cat.isActive && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-1 rounded">inativa</span>
                      )}
                    </div>
                  )}
                </div>
                {editingId !== cat.id && (
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(cat.id);
                        setEditLabel(cat.label);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleActive(cat)}
                      title={cat.isActive ? 'Desativar' : 'Ativar'}
                    >
                      {cat.isActive ? 'Desativar' : 'Ativar'}
                    </Button>
                    {!cat.isDefault && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(cat.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-2">Nova Categoria</p>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-muted-foreground">Nome (slug, ex: WATER_BILL)</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value.toUpperCase())}
                placeholder="EX: WATER_BILL"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Rótulo (exibição)</label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Ex: Conta de água"
                className="h-8 text-sm"
              />
            </div>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={creating || !newName.trim() || !newLabel.trim()}
            >
              {creating ? 'Criando...' : 'Criar Categoria'}
            </Button>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Dialog>
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
