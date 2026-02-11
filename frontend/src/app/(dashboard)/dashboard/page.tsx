'use client';

import { useAuthStore } from '@/lib/stores/auth-store';
import { Calendar, Users, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b">
        <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Bem-vindo(a), <span className="font-medium">{user?.name}</span>
        </p>
      </div>

      {/* User Profile Card */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="p-6 border rounded-lg bg-card shadow-sm">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Perfil
          </h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Email:</span>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Função:</span>
              <p className="font-medium">
                {user?.role === 'ADMIN' && 'Administrador'}
                {user?.role === 'DOCTOR' && 'Médico(a)'}
                {user?.role === 'NURSE' && 'Enfermeiro(a)'}
                {user?.role === 'RECEPTIONIST' && 'Recepcionista'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <p className="font-medium text-green-600">Ativo</p>
            </div>
          </div>
        </div>

        {/* Appointments */}
        <div
          className="p-6 border rounded-lg bg-card shadow-sm cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
          onClick={() => router.push('/dashboard/appointments')}
        >
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Agendamentos
          </h3>
          <p className="text-sm text-muted-foreground">
            Gerencie consultas e agendamentos
          </p>
          <div className="mt-4 text-xs text-muted-foreground">
            Clique para ver e gerenciar consultas agendadas.
          </div>
        </div>

        {/* Patients */}
        <div
          className="p-6 border rounded-lg bg-card shadow-sm cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
          onClick={() => router.push('/dashboard/patients')}
        >
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Pacientes
          </h3>
          <p className="text-sm text-muted-foreground">
            Gerencie o cadastro de pacientes
          </p>
          <div className="mt-4 text-xs text-muted-foreground">
            Clique para cadastrar e visualizar pacientes.
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-8 p-6 bg-primary/5 border border-primary/20 rounded-lg">
        <h3 className="font-semibold mb-2 text-primary">🎉 Sistema em Desenvolvimento</h3>
        <p className="text-sm text-muted-foreground">
          O sistema de autenticação, gestão de pacientes e agendamentos estão disponíveis.
          A funcionalidade de prontuários médicos será implementada em breve.
        </p>
      </div>
    </div>
  );
}
