'use client';

import { useState, useRef } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Loader2, Upload, Trash2, AlertTriangle } from 'lucide-react';
import { uploadCertificate, deleteCertificate } from '@/lib/api/endpoints/prescriptions';
import type { DoctorCertificateMeta } from '@/types';
import { getApiErrorMessage } from '@/lib/api/error-utils';

interface CertificateUploadModalProps {
  open: boolean;
  onClose: () => void;
  current: DoctorCertificateMeta | null;
  onSaved: (meta: DoctorCertificateMeta | null) => void;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function isExpiringSoon(notAfter: string | null | undefined): boolean {
  if (!notAfter) return false;
  const diff = new Date(notAfter).getTime() - Date.now();
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
}

function isExpired(notAfter: string | null | undefined): boolean {
  if (!notAfter) return false;
  return new Date(notAfter).getTime() < Date.now();
}

export function CertificateUploadModal({
  open,
  onClose,
  current,
  onSaved,
}: CertificateUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [state, setState] = useState<'idle' | 'uploading' | 'deleting'>('idle');
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file) return;
    if (!password) { setError('Informe a senha do certificado.'); return; }
    setState('uploading');
    setError(null);
    try {
      const meta = await uploadCertificate(file, password);
      onSaved(meta);
      handleClose();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Erro ao enviar certificado.'));
      setState('idle');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja remover o certificado digital?')) return;
    setState('deleting');
    setError(null);
    try {
      await deleteCertificate();
      onSaved(null);
      handleClose();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Erro ao remover certificado.'));
      setState('idle');
    }
  };

  const handleClose = () => {
    setFile(null);
    setPassword('');
    setState('idle');
    setError(null);
    onClose();
  };

  const isLoading = state !== 'idle';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Certificado Digital ICP-Brasil"
      description="O arquivo .p12 é armazenado criptografado no servidor e nunca é compartilhado."
    >
      <div className="space-y-4">
        {/* Status atual */}
        {current && (
          <div className={`rounded-md border p-3 text-sm space-y-1 ${
            isExpired(current.notAfter)
              ? 'border-red-300 bg-red-50'
              : isExpiringSoon(current.notAfter)
                ? 'border-amber-300 bg-amber-50'
                : 'border-green-300 bg-green-50'
          }`}>
            <p className="font-semibold">
              {isExpired(current.notAfter) ? '❌ Certificado expirado' : '✅ Certificado ativo'}
            </p>
            {current.subjectCN && <p><span className="text-muted-foreground">Titular:</span> {current.subjectCN}</p>}
            {current.issuerCN && <p><span className="text-muted-foreground">Emissor:</span> {current.issuerCN}</p>}
            <p>
              <span className="text-muted-foreground">Validade:</span>{' '}
              {formatDate(current.notBefore)} até {formatDate(current.notAfter)}
            </p>
            {isExpiringSoon(current.notAfter) && !isExpired(current.notAfter) && (
              <p className="text-amber-700 flex items-center gap-1 text-xs">
                <AlertTriangle className="h-3 w-3" /> Vence em breve — faça upload de um novo certificado.
              </p>
            )}
          </div>
        )}

        {!current && (
          <Alert variant="info" className="text-sm">
            Nenhum certificado configurado. Sem o certificado, as receitas serão emitidas{' '}
            <strong>sem assinatura digital</strong>.
          </Alert>
        )}

        {/* Upload */}
        <div className="space-y-2">
          <Label>Arquivo de certificado (.p12 / .pfx)</Label>
          <Input
            ref={fileRef}
            type="file"
            accept=".p12,.pfx"
            disabled={isLoading}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file && (
            <p className="text-xs text-muted-foreground">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Senha do certificado</Label>
          <Input
            type="password"
            placeholder="Senha do .p12"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            autoComplete="new-password"
          />
        </div>

        {error && (
          <Alert variant="destructive" className="text-sm">
            {error}
          </Alert>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between pt-2">
          {current && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isLoading}
              className="gap-1"
            >
              {state === 'deleting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Remover certificado
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleUpload} disabled={!file || !password || isLoading} className="gap-1">
              {state === 'uploading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {current ? 'Substituir' : 'Enviar'}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
