'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/lib/stores/auth-store';
import { getUserById, updateStaffMember, type DoctorProfile } from '@/lib/api/endpoints/users';
import { getCertificateInfo } from '@/lib/api/endpoints/prescriptions';
import { CertificateUploadModal } from '@/components/settings/CertificateUploadModal';
import type { DoctorCertificateMeta } from '@/types';
import { UserRole } from '@/types';
import { getApiErrorMessage } from '@/lib/api/error-utils';
import {
  ShieldCheck,
  Save,
  Loader2,
  AlertTriangle,
  Upload,
} from 'lucide-react';

function isExpiringSoon(notAfter: string | null | undefined): boolean {
  if (!notAfter) return false;
  const diff = new Date(notAfter).getTime() - Date.now();
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
}

function isExpired(notAfter: string | null | undefined): boolean {
  if (!notAfter) return false;
  return new Date(notAfter).getTime() < Date.now();
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [certMeta, setCertMeta] = useState<DoctorCertificateMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCertModal, setShowCertModal] = useState(false);

  // Form state
  const [crm, setCrm] = useState('');
  const [crmUf, setCrmUf] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [p, cert] = await Promise.all([
        getUserById(user.id),
        getCertificateInfo().catch(() => null),
      ]);
      setProfile(p);
      setCertMeta(cert);
      setCrm(p.crm ?? '');
      setCrmUf(p.crmUf ?? '');
      setClinicName(p.clinicName ?? '');
      setClinicAddress(p.clinicAddress ?? '');
      setClinicPhone(p.clinicPhone ?? '');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Erro inesperado.'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateStaffMember(user.id, { crm, crmUf, clinicName, clinicAddress, clinicPhone });
      setSuccess('Perfil atualizado com sucesso!');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Erro inesperado.'));
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== UserRole.DOCTOR) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="border-red-400 bg-red-50 text-red-700">
          Esta página é exclusiva para médicos.
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold">Meu Perfil</h1>

      {/* CRM + Clínica */}
      <div className="rounded-lg border p-6 space-y-5">
        <h2 className="text-lg font-semibold">Dados Profissionais</h2>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>CRM</Label>
                <Input
                  placeholder="123456"
                  value={crm}
                  onChange={(e) => setCrm(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="space-y-1">
                <Label>UF do CRM</Label>
                <Input
                  placeholder="SP"
                  maxLength={2}
                  value={crmUf}
                  onChange={(e) => setCrmUf(e.target.value.toUpperCase())}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Nome da Clínica</Label>
              <Input
                placeholder="Clínica Saúde da Mulher"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="space-y-1">
              <Label>Endereço da Clínica</Label>
              <Input
                placeholder="Rua das Flores, 123 — São Paulo/SP"
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="space-y-1">
              <Label>Telefone da Clínica</Label>
              <Input
                placeholder="(11) 99999-9999"
                value={clinicPhone}
                onChange={(e) => setClinicPhone(e.target.value)}
                disabled={saving}
              />
            </div>

            {error && (
              <Alert className="border-red-400 bg-red-50 text-red-700 text-sm">{error}</Alert>
            )}
            {success && (
              <Alert className="border-green-400 bg-green-50 text-green-700 text-sm">{success}</Alert>
            )}

            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          </>
        )}
      </div>

      {/* Certificado Digital */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Certificado Digital ICP-Brasil
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCertModal(true)}
            className="gap-1"
          >
            <Upload className="h-4 w-4" />
            {certMeta ? 'Gerenciar' : 'Configurar'}
          </Button>
        </div>

        {loading ? (
          <Skeleton className="h-14 w-full" />
        ) : certMeta ? (
          <div className={`rounded-md p-3 text-sm space-y-1 ${
            isExpired(certMeta.notAfter)
              ? 'border border-red-300 bg-red-50'
              : isExpiringSoon(certMeta.notAfter)
                ? 'border border-amber-300 bg-amber-50'
                : 'border border-green-300 bg-green-50'
          }`}>
            {certMeta.subjectCN && <p><span className="text-muted-foreground">Titular:</span> {certMeta.subjectCN}</p>}
            {certMeta.issuerCN && <p><span className="text-muted-foreground">Emissor:</span> {certMeta.issuerCN}</p>}
            {certMeta.notAfter && (
              <p>
                <span className="text-muted-foreground">Válido até:</span>{' '}
                {new Date(certMeta.notAfter).toLocaleDateString('pt-BR')}
                {isExpired(certMeta.notAfter) && (
                  <span className="ml-2 text-red-600 font-medium">● Expirado</span>
                )}
                {isExpiringSoon(certMeta.notAfter) && !isExpired(certMeta.notAfter) && (
                  <span className="ml-2 text-amber-600 font-medium flex items-center gap-1 inline-flex">
                    <AlertTriangle className="h-3 w-3" /> Vence em breve
                  </span>
                )}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Certificado não configurado. Sem ele, as receitas serão geradas{' '}
              <strong>sem assinatura digital</strong> e podem não ser aceitas em farmácias para
              medicamentos controlados.
            </span>
          </div>
        )}
      </div>

      <CertificateUploadModal
        open={showCertModal}
        onClose={() => setShowCertModal(false)}
        current={certMeta}
        onSaved={(meta) => setCertMeta(meta)}
      />
    </div>
  );
}
