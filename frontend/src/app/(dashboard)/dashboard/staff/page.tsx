'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog } from '@/components/ui/dialog';
import { useAuthStore } from '@/lib/stores/auth-store';
import {
  getStaff,
  createStaffMember,
  updateStaffMember,
  resetStaffPassword,
  type StaffMember,
  type CreateStaffData,
  type UpdateStaffData,
} from '@/lib/api/endpoints/users';
import { UserRole } from '@/types';
import { cn } from '@/lib/utils';
import {
  Plus,
  Pencil,
  KeyRound,
  UserCheck,
  UserX,
  Search,
  Users,
} from 'lucide-react';

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  ADMIN: { label: 'Administrador', color: 'bg-purple-100 text-purple-700' },
  DOCTOR: { label: 'Médico(a)', color: 'bg-blue-100 text-blue-700' },
  NURSE: { label: 'Enfermeiro(a)', color: 'bg-green-100 text-green-700' },
  RECEPTIONIST: { label: 'Recepcionista', color: 'bg-amber-100 text-amber-700' },
};

const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'Todos os cargos' },
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'DOCTOR', label: 'Médico(a)' },
  { value: 'NURSE', label: 'Enfermeiro(a)' },
  { value: 'RECEPTIONIST', label: 'Recepcionista' },
];

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role] ?? { label: role, color: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function extractApiError(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const msg = (err as { response?: { data?: { message?: string | string[] } } }).response
      ?.data?.message;
    if (Array.isArray(msg)) return msg[0];
    if (msg) return msg;
  }
  return 'Erro ao executar ação';
}

export default function StaffPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === UserRole.ADMIN;

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [passwordMember, setPasswordMember] = useState<StaffMember | null>(null);

  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getStaff();
      setStaff(data);
    } catch (err: unknown) {
      setError(extractApiError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const filteredStaff = staff.filter((m) => {
    if (roleFilter && m.role !== roleFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    }
    return true;
  });

  const handleToggleActive = async (member: StaffMember) => {
    try {
      await updateStaffMember(member.id, { isActive: !member.isActive });
      await fetchStaff();
    } catch (err: unknown) {
      setError(extractApiError(err));
    }
  };

  const openCreate = () => {
    setEditingMember(null);
    setDialogOpen(true);
  };

  const openEdit = (member: StaffMember) => {
    setEditingMember(member);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingMember(null);
  };

  const handleDialogSave = async () => {
    await fetchStaff();
    handleDialogClose();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Equipe</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os membros da equipe da clínica
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Membro
          </Button>
        )}
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      {/* Filters */}
      {!isLoading && staff.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-48">
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              {ROLE_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          <span className="text-sm text-muted-foreground">
            {filteredStaff.length} membro{filteredStaff.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && staff.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Nenhum membro cadastrado</p>
        </div>
      )}

      {/* No results */}
      {!isLoading && staff.length > 0 && filteredStaff.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Nenhum membro encontrado para os filtros aplicados
          </p>
        </div>
      )}

      {/* Table */}
      {!isLoading && filteredStaff.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                  Nome
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                  Email
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                  Cargo
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                  Status
                </th>
                {isAdmin && (
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((member) => (
                <tr
                  key={member.id}
                  className={cn(
                    'border-b last:border-b-0 transition-colors hover:bg-muted/30',
                    !member.isActive && 'opacity-60',
                  )}
                >
                  <td className="px-4 py-3 font-medium">{member.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {member.email}
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={member.role} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        member.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700',
                      )}
                    >
                      {member.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Editar"
                          onClick={() => openEdit(member)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Alterar Senha"
                          onClick={() => setPasswordMember(member)}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title={member.isActive ? 'Desativar' : 'Ativar'}
                          onClick={() => handleToggleActive(member)}
                          className={
                            member.isActive
                              ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                              : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                          }
                        >
                          {member.isActive ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit dialog */}
      <StaffFormDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSave={handleDialogSave}
        member={editingMember}
      />

      {/* Password reset dialog */}
      <PasswordResetDialog
        open={!!passwordMember}
        onClose={() => setPasswordMember(null)}
        member={passwordMember}
      />
    </div>
  );
}

/* ---------- Staff Form Dialog ---------- */

function StaffFormDialog({
  open,
  onClose,
  onSave,
  member,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  member: StaffMember | null;
}) {
  const isEdit = !!member;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('DOCTOR');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (member) {
        setName(member.name);
        setEmail(member.email);
        setRole(member.role);
        setPassword('');
      } else {
        setName('');
        setEmail('');
        setRole('DOCTOR');
        setPassword('');
      }
      setFormError(null);
      setFieldErrors({});
    }
  }, [open, member]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) {
      errors.name = 'Nome deve ter no mínimo 2 caracteres';
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Email inválido';
    }
    if (!isEdit && (!password || password.length < 6)) {
      errors.password = 'Senha deve ter no mínimo 6 caracteres';
    }
    if (!role) {
      errors.role = 'Cargo é obrigatório';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      if (isEdit) {
        const data: UpdateStaffData = {};
        if (name !== member!.name) data.name = name.trim();
        if (email !== member!.email) data.email = email.trim();
        if (role !== member!.role) data.role = role;
        await updateStaffMember(member!.id, data);
      } else {
        const data: CreateStaffData = {
          name: name.trim(),
          email: email.trim(),
          password,
          role,
        };
        await createStaffMember(data);
      }
      await onSave();
    } catch (err: unknown) {
      setFormError(extractApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar Membro' : 'Novo Membro da Equipe'}
      description={
        isEdit
          ? 'Atualize os dados do membro'
          : 'Preencha os dados para cadastrar um novo membro'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && <Alert variant="destructive">{formError}</Alert>}

        <div className="space-y-2">
          <Label htmlFor="staff-name">Nome</Label>
          <Input
            id="staff-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dr. João Silva"
            error={fieldErrors.name}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="staff-email">Email</Label>
          <Input
            id="staff-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="joao@clinica.com"
            error={fieldErrors.email}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="staff-role">Cargo</Label>
          <Select
            id="staff-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            error={fieldErrors.role}
          >
            <option value="DOCTOR">Médico(a)</option>
            <option value="NURSE">Enfermeiro(a)</option>
            <option value="RECEPTIONIST">Recepcionista</option>
            <option value="ADMIN">Administrador</option>
          </Select>
        </div>

        {!isEdit && (
          <div className="space-y-2">
            <Label htmlFor="staff-password">Senha</Label>
            <Input
              id="staff-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              error={fieldErrors.password}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Salvando...'
              : isEdit
                ? 'Salvar Alterações'
                : 'Cadastrar'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/* ---------- Password Reset Dialog ---------- */

function PasswordResetDialog({
  open,
  onClose,
  member,
}: {
  open: boolean;
  onClose: () => void;
  member: StaffMember | null;
}) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword('');
      setConfirmPassword('');
      setFormError(null);
      setFieldErrors({});
      setSuccess(false);
    }
  }, [open]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!password || password.length < 6) {
      errors.password = 'Senha deve ter no mínimo 6 caracteres';
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = 'As senhas não coincidem';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !validate()) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      await resetStaffPassword(member.id, password);
      setSuccess(true);
    } catch (err: unknown) {
      setFormError(extractApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Alterar Senha"
      description={member ? `Definir nova senha para ${member.name}` : ''}
    >
      {success ? (
        <div className="space-y-4">
          <Alert>Senha alterada com sucesso.</Alert>
          <div className="flex justify-end">
            <Button onClick={onClose}>Fechar</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <Alert variant="destructive">{formError}</Alert>}

          <div className="space-y-2">
            <Label htmlFor="new-password">Nova Senha</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              error={fieldErrors.password}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar Senha</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha"
              error={fieldErrors.confirmPassword}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Alterar Senha'}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
