'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppointmentStore } from '@/lib/stores/appointment-store';
import { getApiErrorMessage, isForbiddenError } from '@/lib/api/error-utils';
import {
  startEncounter,
  completeAppointment,
  getAppointmentMedicalRecord,
  createMedicalRecord,
  updateMedicalRecord,
  finalizeMedicalRecord,
} from '@/lib/api/endpoints/medical-records';
import type { MedicalRecord, Prescription } from '@/types';
import type { Appointment } from '@/lib/api/endpoints/appointments';
import { Cid10Combobox } from './Cid10Combobox';
import { MedicalRecordPDF } from './MedicalRecordPDF';
import {
  Play,
  Save,
  Lock,
  CheckCircle,
  FileText,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';

interface EncounterSectionProps {
  appointment: Appointment;
}

type ActionState = 'idle' | 'loading';

const SOAP_LABELS: Record<string, { label: string; placeholder: string }> = {
  subjective: { label: 'Subjetivo (S)', placeholder: 'Queixa principal, história da doença atual, revisão de sistemas...' },
  objective: { label: 'Objetivo (O)', placeholder: 'Exame físico, sinais vitais, achados relevantes...' },
  assessment: { label: 'Avaliação (A)', placeholder: 'Diagnóstico, hipóteses diagnósticas, diagnósticos diferenciais...' },
  plan: { label: 'Plano (P)', placeholder: 'Tratamento, prescrições, exames solicitados, orientações, retorno...' },
};

const EMPTY_PRESCRIPTION: Prescription = { drug: '', dosage: '', frequency: '', duration: '', instructions: '' };

export function EncounterSection({ appointment }: EncounterSectionProps) {
  const router = useRouter();
  const { fetchAppointment } = useAppointmentStore();

  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [cid10, setCid10] = useState('');
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);

  const [startState, setStartState] = useState<ActionState>('idle');
  const [saveState, setSaveState] = useState<ActionState>('idle');
  const [finalizeState, setFinalizeState] = useState<ActionState>('idle');
  const [completeState, setCompleteState] = useState<ActionState>('idle');

  const isAnyActionLoading =
    startState === 'loading' || saveState === 'loading' || finalizeState === 'loading' || completeState === 'loading';

  const fetchRecord = useCallback(async () => {
    if (!['IN_PROGRESS', 'COMPLETED'].includes(appointment.status)) return;
    setRecordLoading(true);
    try {
      const data = await getAppointmentMedicalRecord(appointment.id);
      setRecord(data);
      setIsForbidden(false);
      if (data) {
        setSubjective(data.subjective);
        setObjective(data.objective);
        setAssessment(data.assessment);
        setPlan(data.plan);
        setCid10(data.cid10 ?? '');
        setPrescriptions(data.prescriptions ?? []);
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Erro ao carregar prontuário'));
      setIsForbidden(isForbiddenError(err));
    } finally {
      setRecordLoading(false);
    }
  }, [appointment.id, appointment.status]);

  useEffect(() => { fetchRecord(); }, [fetchRecord]);

  const clearMessages = () => { setError(null); setIsForbidden(false); setSuccessMsg(null); };
  const addPrescription = () => setPrescriptions((prev) => [...prev, { ...EMPTY_PRESCRIPTION }]);
  const removePrescription = (index: number) => setPrescriptions((prev) => prev.filter((_, i) => i !== index));
  const updatePrescriptionField = (index: number, field: keyof Prescription, value: string) =>
    setPrescriptions((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));

  const handleStartEncounter = async () => {
    clearMessages(); setStartState('loading');
    try { await startEncounter(appointment.id); await fetchAppointment(appointment.id); }
    catch (err: unknown) { setError(getApiErrorMessage(err, 'Erro ao iniciar atendimento')); setIsForbidden(isForbiddenError(err)); }
    finally { setStartState('idle'); }
  };

  const handleSave = async () => {
    clearMessages(); setSaveState('loading');
    try {
      if (record) {
        const updated = await updateMedicalRecord(record.id, {
          subjective, objective, assessment, plan, cid10: cid10 || undefined, prescriptions,
        });
        setRecord(updated); setSuccessMsg('Prontuário salvo com sucesso');
      } else {
        const created = await createMedicalRecord({
          appointmentId: appointment.id, patientId: appointment.patientId, doctorId: appointment.doctorId,
          subjective, objective, assessment, plan, cid10: cid10 || undefined, prescriptions,
        });
        setRecord(created); setSuccessMsg('Prontuário criado com sucesso');
      }
    } catch (err: unknown) { setError(getApiErrorMessage(err, 'Erro ao salvar prontuário')); setIsForbidden(isForbiddenError(err)); }
    finally { setSaveState('idle'); }
  };

  const handleFinalize = async () => {
    if (!record) return;
    clearMessages(); setFinalizeState('loading');
    try { const updated = await finalizeMedicalRecord(record.id); setRecord(updated); setSuccessMsg('Prontuário finalizado com sucesso'); }
    catch (err: unknown) { setError(getApiErrorMessage(err, 'Erro ao finalizar prontuário')); setIsForbidden(isForbiddenError(err)); }
    finally { setFinalizeState('idle'); }
  };

  const handleComplete = async () => {
    clearMessages(); setCompleteState('loading');
    try { await completeAppointment(appointment.id); await fetchAppointment(appointment.id); setSuccessMsg('Atendimento concluído com sucesso'); }
    catch (err: unknown) { setError(getApiErrorMessage(err, 'Erro ao concluir atendimento')); setIsForbidden(isForbiddenError(err)); }
    finally { setCompleteState('idle'); }
  };

  const isReadOnly = record?.status === 'FINAL' || appointment.status === 'COMPLETED';

  if (appointment.status === 'SCHEDULED' || appointment.status === 'CONFIRMED' || appointment.status === 'CHECKED_IN') {
    return (
      <div className="p-6 border rounded-lg bg-card shadow-sm">
        <h3 className="font-semibold text-lg mb-4 pb-2 border-b flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />Atendimento
        </h3>
        {error && <Alert variant="destructive" className="mb-4">{error}</Alert>}
        <p className="text-sm text-muted-foreground mb-4">Inicie o atendimento para criar o prontuário SOAP.</p>
        <Button onClick={handleStartEncounter} disabled={isAnyActionLoading}>
          {startState === 'loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
          Iniciar Atendimento
        </Button>
      </div>
    );
  }

  if (appointment.status === 'CANCELLED' || appointment.status === 'NO_SHOW') return null;

  if (recordLoading) {
    return (
      <div className="p-6 border rounded-lg bg-card shadow-sm space-y-4">
        <Skeleton className="h-6 w-48" /><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isForbidden) {
    return (
      <div className="p-6 border rounded-lg bg-card shadow-sm space-y-3">
        <Alert variant="destructive">{error || 'Sem permissão para acessar este recurso.'}</Alert>
        <Button variant="outline" onClick={() => router.back()}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="p-6 border rounded-lg bg-card shadow-sm">
      <h3 className="font-semibold text-lg mb-4 pb-2 border-b flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        Prontuário SOAP
        {record?.status === 'FINAL' && (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            <Lock className="h-3 w-3" />Finalizado
          </span>
        )}
        {record?.status === 'DRAFT' && (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
            Rascunho
          </span>
        )}
      </h3>

      {error && <Alert variant="destructive" className="mb-4">{error}</Alert>}
      {successMsg && <Alert variant="success" className="mb-4">{successMsg}</Alert>}

      <div className="space-y-4">
        {(['subjective', 'objective', 'assessment', 'plan'] as const).map((field) => {
          const config = SOAP_LABELS[field];
          const value = { subjective, objective, assessment, plan }[field];
          const setter = { subjective: setSubjective, objective: setObjective, assessment: setAssessment, plan: setPlan }[field];
          return (
            <div key={field}>
              <label className="block text-sm font-medium mb-1.5">{config.label}</label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                placeholder={config.placeholder}
                value={value}
                onChange={(e) => setter(e.target.value)}
                disabled={isReadOnly}
                rows={4}
              />
            </div>
          );
        })}

        <div>
          <label className="block text-sm font-medium mb-1.5">CID-10</label>
          <Cid10Combobox value={cid10} onChange={setCid10} disabled={isReadOnly} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">Prescrições</label>
            {!isReadOnly && (
              <Button type="button" variant="outline" size="sm" onClick={addPrescription}>
                <Plus className="mr-1 h-3 w-3" />Adicionar
              </Button>
            )}
          </div>
          {prescriptions.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              {isReadOnly ? 'Nenhuma prescrição.' : 'Nenhuma prescrição adicionada.'}
            </p>
          )}
          {isReadOnly && prescriptions.length > 0 && (
            <table className="w-full text-sm border rounded-md overflow-hidden">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Medicamento</th>
                  <th className="text-left px-3 py-2 font-medium">Dose</th>
                  <th className="text-left px-3 py-2 font-medium">Frequência</th>
                  <th className="text-left px-3 py-2 font-medium">Duração</th>
                  <th className="text-left px-3 py-2 font-medium">Instruções</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((p, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{p.drug}</td>
                    <td className="px-3 py-2">{p.dosage}</td>
                    <td className="px-3 py-2">{p.frequency}</td>
                    <td className="px-3 py-2">{p.duration}</td>
                    <td className="px-3 py-2">{p.instructions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!isReadOnly && prescriptions.length > 0 && (
            <div className="space-y-3">
              {prescriptions.map((p, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 rounded-md border p-3 relative">
                  <button
                    type="button"
                    onClick={() => removePrescription(i)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {([
                    { field: 'drug' as const, label: 'Medicamento', placeholder: 'Omeprazol', span: false },
                    { field: 'dosage' as const, label: 'Dose', placeholder: '20mg', span: false },
                    { field: 'frequency' as const, label: 'Frequência', placeholder: '1x ao dia', span: false },
                    { field: 'duration' as const, label: 'Duração', placeholder: '30 dias', span: false },
                    { field: 'instructions' as const, label: 'Instruções', placeholder: 'Em jejum', span: true },
                  ]).map(({ field, label, placeholder, span }) => (
                    <div key={field} className={span ? 'col-span-2' : ''}>
                      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
                      <input
                        type="text"
                        className="w-full rounded-md border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder={placeholder}
                        value={p[field]}
                        onChange={(e) => updatePrescriptionField(i, field, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {record?.status === 'FINAL' && record.finalizedAt && (
        <p className="text-xs text-muted-foreground mt-4">
          Finalizado em {new Date(record.finalizedAt).toLocaleString('pt-BR')}
          {record.finalizedBy && <> por {record.finalizedBy.name}</>}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
        {!isReadOnly && (
          <Button
            onClick={handleSave}
            disabled={isAnyActionLoading || (!subjective && !objective && !assessment && !plan)}
            variant="outline"
          >
            {saveState === 'loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Prontuário
          </Button>
        )}
        {record && record.status === 'DRAFT' && (
          <Button onClick={handleFinalize} disabled={isAnyActionLoading}>
            {finalizeState === 'loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
            Finalizar Prontuário
          </Button>
        )}
        {record?.status === 'FINAL' && appointment.status === 'IN_PROGRESS' && (
          <Button onClick={handleComplete} disabled={isAnyActionLoading} className="bg-green-600 hover:bg-green-700 text-white">
            {completeState === 'loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Concluir Atendimento
          </Button>
        )}
        {record?.status === 'FINAL' && (
          <MedicalRecordPDF record={record} appointment={appointment} />
        )}
      </div>
    </div>
  );
}
