'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { getAuditLogs, type AuditLogRow } from '@/lib/api/endpoints/audit';
import { useAuthStore } from '@/lib/stores/auth-store';
import { formatDateTime } from '@/lib/utils';
import { UserRole } from '@/types';

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function extractApiError(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const msg = (err as { response?: { data?: { message?: string | string[] } } }).response
      ?.data?.message;
    if (Array.isArray(msg)) return msg[0];
    if (msg) return msg;
  }
  return 'Erro ao carregar auditoria';
}

const ENTITY_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'APPOINTMENT', label: 'Appointment' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'MEDICAL_RECORD', label: 'Medical Record' },
  { value: 'PATIENT', label: 'Patient' },
];

export default function AuditPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === UserRole.ADMIN;

  const today = new Date();
  const [start, setStart] = useState(toYmd(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)));
  const [end, setEnd] = useState(toYmd(today));
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [actorUserId, setActorUserId] = useState('');
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAuditLogs({
        entityType: entityType || undefined,
        entityId: entityId || undefined,
        actorUserId: actorUserId || undefined,
        start: start || undefined,
        end: end || undefined,
        limit: 50,
      });
      setRows(data.rows);
    } catch (err: unknown) {
      setError(extractApiError(err));
    } finally {
      setIsLoading(false);
    }
  }, [actorUserId, end, entityId, entityType, start]);

  useEffect(() => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }
    fetchLogs();
  }, [fetchLogs, isAdmin]);

  if (!isAdmin) {
    return <Alert variant="destructive">Acesso restrito a administradores.</Alert>;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await fetchLogs();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Auditoria</h1>
        <p className="text-muted-foreground mt-1">Visualizador de logs críticos do sistema</p>
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div>
          <label className="text-sm text-muted-foreground">Entity Type</label>
          <Select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
            {ENTITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Entity ID</label>
          <Input value={entityId} onChange={(e) => setEntityId(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Actor User ID</label>
          <Input value={actorUserId} onChange={(e) => setActorUserId(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Início</label>
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-sm text-muted-foreground">Fim</label>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <Button className="self-end" type="submit" disabled={isLoading}>
            Buscar
          </Button>
        </div>
      </form>

      {error && <Alert variant="destructive">{error}</Alert>}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-3 py-2">Data/Hora</th>
                  <th className="text-left px-3 py-2">Actor User</th>
                  <th className="text-left px-3 py-2">Role</th>
                  <th className="text-left px-3 py-2">Action</th>
                  <th className="text-left px-3 py-2">Entity Type</th>
                  <th className="text-left px-3 py-2">Entity ID</th>
                  <th className="text-left px-3 py-2">Metadata</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0 align-top">
                    <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.actorUserId}</td>
                    <td className="px-3 py-2">{row.actorRole}</td>
                    <td className="px-3 py-2">{row.action}</td>
                    <td className="px-3 py-2">{row.entityType}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.entityId}</td>
                    <td className="px-3 py-2 max-w-sm">
                      {row.metadata ? (
                        <details>
                          <summary className="cursor-pointer text-primary">Ver JSON</summary>
                          <pre className="mt-2 text-xs whitespace-pre-wrap break-all">
                            {JSON.stringify(row.metadata, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-center text-muted-foreground" colSpan={7}>
                      Nenhum log encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
