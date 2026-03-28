'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Loader2, FileDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { issuePrescription, getPrescriptionDownloadUrl } from '@/lib/api/endpoints/prescriptions';
import { PrescriptionType } from '@/types';
import type { Prescription, IssuedPrescription } from '@/types';
import { getApiErrorMessage } from '@/lib/api/error-utils';

interface PrescriptionModalProps {
  open: boolean;
  onClose: () => void;
  medicalRecordId: string;
  prescriptions: Prescription[];
  cid10?: string | null;
  type: PrescriptionType;
}

const TYPE_LABELS: Record<PrescriptionType, string> = {
  [PrescriptionType.SIMPLES]: 'Receita Simples',
  [PrescriptionType.CONTROLE_ESPECIAL_C1]: 'Receita de Controle Especial (C1)',
};

export function PrescriptionModal({
  open,
  onClose,
  medicalRecordId,
  prescriptions,
  cid10,
  type,
}: PrescriptionModalProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [issued, setIssued] = useState<IssuedPrescription | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleIssue = async () => {
    setState('loading');
    setErrorMsg(null);
    try {
      const result = await issuePrescription({ medicalRecordId, type });
      setIssued(result);
      setState('done');
    } catch (err: unknown) {
      setErrorMsg(getApiErrorMessage(err, 'Erro ao emitir receita.'));
      setState('error');
    }
  };

  const handleClose = () => {
    setState('idle');
    setIssued(null);
    setErrorMsg(null);
    onClose();
  };

  const isC1 = type === PrescriptionType.CONTROLE_ESPECIAL_C1;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={`Emitir ${TYPE_LABELS[type]}`}
      description={
        isC1
          ? 'Serão geradas 2 vias (farmácia e paciente) conforme a Portaria SVS/MS nº 344/98.'
          : 'Será gerado um PDF com assinatura digital ICP-Brasil.'
      }
    >
      <div className="space-y-4">
        {/* Lista de medicamentos */}
        <div className="rounded-md border p-3 bg-muted/40 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Medicamentos prescritos</p>
          {prescriptions.map((rx, i) => (
            <div key={i} className="text-sm">
              <span className="font-semibold">{i + 1}. {rx.drug}</span>
              {rx.dosage && <span className="text-muted-foreground"> — {rx.dosage}</span>}
              <div className="text-xs text-muted-foreground pl-3">
                {rx.frequency} por {rx.duration}
                {rx.instructions && <> · {rx.instructions}</>}
              </div>
            </div>
          ))}
          {cid10 && (
            <p className="text-xs text-muted-foreground pt-1">CID-10: {cid10}</p>
          )}
        </div>

        {isC1 && state === 'idle' && (
          <Alert variant="default" className="border-amber-400 bg-amber-50 text-amber-800 text-sm">
            <AlertTriangle className="h-4 w-4" />
            Receita válida por <strong>30 dias</strong>. Guarde a 2ª via para o prontuário.
          </Alert>
        )}

        {state === 'error' && errorMsg && (
          <Alert variant="destructive" className="text-sm">
            {errorMsg}
          </Alert>
        )}

        {state === 'done' && issued && (
          <div className="rounded-md border border-green-400 bg-green-50 p-3 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">Receita emitida com sucesso!</p>
              {issued.isSigned ? (
                <p className="text-xs text-green-700">Assinada digitalmente com certificado ICP-Brasil.</p>
              ) : (
                <p className="text-xs text-amber-700">Emitida sem assinatura digital (certificado não configurado).</p>
              )}
            </div>
            <a
              href={getPrescriptionDownloadUrl(issued.id)}
              target="_blank"
              rel="noopener noreferrer"
              download
            >
              <Button size="sm" variant="outline" className="gap-1">
                <FileDown className="h-4 w-4" />
                Baixar PDF
              </Button>
            </a>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleClose}>
            {state === 'done' ? 'Fechar' : 'Cancelar'}
          </Button>
          {state !== 'done' && (
            <Button onClick={handleIssue} disabled={state === 'loading'}>
              {state === 'loading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Emitir e Assinar
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
