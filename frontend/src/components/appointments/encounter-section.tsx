'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppointmentStore } from '@/lib/stores/appointment-store';
import {
  startEncounter,
  completeAppointment,
  getAppointmentMedicalRecord,
  createMedicalRecord,
  updateMedicalRecord,
  finalizeMedicalRecord,
} from '@/lib/api/endpoints/medical-records';
import type { MedicalRecord } from '@/types';
import type { Appointment } from '@/lib/api/endpoints/appointments';
import {
  Play,
  Save,
  Lock,
  CheckCircle,
  FileText,
  Loader2,
} from 'lucide-react';

interface EncounterSectionProps {
  appointment: Appointment;
}

type ActionState = 'idle' | 'loading';

const SOAP_LABELS: Record<string, { label: string; placeholder: string }> = {
  subjective: {
    label: 'Subjetivo (S)',
    placeholder: 'Queixa principal, história da doença atual, revisão de sistemas...',
  },
  objective: {
    label: 'Objetivo (O)',
    placeholder: 'Exame físico, sinais vitais, achados relevantes...',
  },
  assessment: {
    label: 'Avaliação (A)',
    placeholder: 'Diagnóstico, hipóteses diagnósticas, diagnósticos diferenciais...',
  },
  plan: {
    label: 'Plano (P)',
    placeholder: 'Tratamento, prescrições, exames solicitados, orientações, retorno...',
  },
};

export function EncounterSection({ appointment }: EncounterSectionProps) {
  const { fetchAppointment } = useAppointmentStore();

  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // SOAP form fields
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');

  // Action states
  const [startState, setStartState] = useState<ActionState>('idle');
  const [saveState, setSaveState] = useState<ActionState>('idle');
  const [finalizeState, setFinalizeState] = useState<ActionState>('idle');
  const [completeState, setCompleteState] = useState<ActionState>('idle');

  const isAnyActionLoading =
    startState === 'loading' ||
    saveState === 'loading' ||
    finalizeState === 'loading' ||
    completeState === 'loading';

  // Fetch medical record when appointment is IN_PROGRESS or COMPLETED
  const fetchRecord = useCallback(async () => {
    if (!['IN_PROGRESS', 'COMPLETED'].includes(appointment.status)) return;
    setRecordLoading(true);
    try {
      const data = await getAppointmentMedicalRecord(appointment.id);
      setRecord(data);
      if (data) {
        setSubjective(data.subjective);
        setObjective(data.objective);
        setAssessment(data.assessment);
        setPlan(data.plan);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar prontuário');
    } finally {
      setRecordLoading(false);
    }
  }, [appointment.id, appointment.status]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const clearMessages = () => {
    setError(null);
    setSuccessMsg(null);
  };

  // --- Actions ---

  const handleStartEncounter = async () => {
    clearMessages();
    setStartState('loading');
    try {
      await startEncounter(appointment.id);
      await fetchAppointment(appointment.id);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao iniciar atendimento');
    } finally {
      setStartState('idle');
    }
  };

  const handleSave = async () => {
    clearMessages();
    setSaveState('loading');
    try {
      if (record) {
        // Update existing
        const updated = await updateMedicalRecord(record.id, {
          subjective,
          objective,
          assessment,
          plan,
        });
        setRecord(updated);
        setSuccessMsg('Prontuário salvo com sucesso');
      } else {
        // Create new
        const created = await createMedicalRecord({
          appointmentId: appointment.id,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          subjective,
          objective,
          assessment,
          plan,
        });
        setRecord(created);
        setSuccessMsg('Prontuário criado com sucesso');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar prontuário');
    } finally {
      setSaveState('idle');
    }
  };

  const handleFinalize = async () => {
    if (!record) return;
    clearMessages();
    setFinalizeState('loading');
    try {
      const updated = await finalizeMedicalRecord(record.id);
      setRecord(updated);
      setSuccessMsg('Prontuário finalizado com sucesso');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao finalizar prontuário');
    } finally {
      setFinalizeState('idle');
    }
  };

  const handleComplete = async () => {
    clearMessages();
    setCompleteState('loading');
    try {
      await completeAppointment(appointment.id);
      await fetchAppointment(appointment.id);
      setSuccessMsg('Atendimento concluído com sucesso');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao concluir atendimento');
    } finally {
      setCompleteState('idle');
    }
  };

  // --- Renders ---

  const isReadOnly = record?.status === 'FINAL' || appointment.status === 'COMPLETED';

  // SCHEDULED or CONFIRMED -> show start button
  if (appointment.status === 'SCHEDULED' || appointment.status === 'CONFIRMED') {
    return (
      <div className="p-6 border rounded-lg bg-card shadow-sm">
        <h3 className="font-semibold text-lg mb-4 pb-2 border-b flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Atendimento
        </h3>
        {error && (
          <Alert variant="destructive" className="mb-4">
            {error}
          </Alert>
        )}
        <p className="text-sm text-muted-foreground mb-4">
          Inicie o atendimento para criar o prontuário SOAP.
        </p>
        <Button onClick={handleStartEncounter} disabled={isAnyActionLoading}>
          {startState === 'loading' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Iniciar Atendimento
        </Button>
      </div>
    );
  }

  // CANCELLED / NO_SHOW -> nothing
  if (appointment.status === 'CANCELLED' || appointment.status === 'NO_SHOW') {
    return null;
  }

  // IN_PROGRESS or COMPLETED -> show SOAP form
  if (recordLoading) {
    return (
      <div className="p-6 border rounded-lg bg-card shadow-sm space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
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
            <Lock className="h-3 w-3" />
            Finalizado
          </span>
        )}
        {record?.status === 'DRAFT' && (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
            Rascunho
          </span>
        )}
      </h3>

      {error && (
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
      )}
      {successMsg && (
        <Alert variant="success" className="mb-4">
          {successMsg}
        </Alert>
      )}

      {/* SOAP Fields */}
      <div className="space-y-4">
        {(['subjective', 'objective', 'assessment', 'plan'] as const).map((field) => {
          const config = SOAP_LABELS[field];
          const value = { subjective, objective, assessment, plan }[field];
          const setter = {
            subjective: setSubjective,
            objective: setObjective,
            assessment: setAssessment,
            plan: setPlan,
          }[field];

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
      </div>

      {/* Finalization info */}
      {record?.status === 'FINAL' && record.finalizedAt && (
        <p className="text-xs text-muted-foreground mt-4">
          Finalizado em {new Date(record.finalizedAt).toLocaleString('pt-BR')}{' '}
          {record.finalizedBy && <>por {record.finalizedBy.name}</>}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
        {/* Save (only for DRAFT / new) */}
        {!isReadOnly && (
          <Button
            onClick={handleSave}
            disabled={isAnyActionLoading || (!subjective && !objective && !assessment && !plan)}
            variant="outline"
          >
            {saveState === 'loading' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar Prontuário
          </Button>
        )}

        {/* Finalize (only for existing DRAFT) */}
        {record && record.status === 'DRAFT' && (
          <Button
            onClick={handleFinalize}
            disabled={isAnyActionLoading}
          >
            {finalizeState === 'loading' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Lock className="mr-2 h-4 w-4" />
            )}
            Finalizar Prontuário
          </Button>
        )}

        {/* Complete appointment (only when record is FINAL and appointment is IN_PROGRESS) */}
        {record?.status === 'FINAL' && appointment.status === 'IN_PROGRESS' && (
          <Button
            onClick={handleComplete}
            disabled={isAnyActionLoading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {completeState === 'loading' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Concluir Atendimento
          </Button>
        )}
      </div>
    </div>
  );
}
