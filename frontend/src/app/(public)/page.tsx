'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl font-bold text-center mb-4 text-primary">
          Sistema de Gestão - Consultório de Ginecologia
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          Gerenciamento completo de consultas, prontuários eletrônicos e comunicação com pacientes
        </p>

        <div className="flex justify-center mb-8">
          <Button
            onClick={() => router.push('/login')}
            size="lg"
            className="gap-2"
          >
            <LogIn className="h-5 w-5" />
            Acessar Sistema
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
            <h3 className="font-semibold text-lg mb-2">📅 Agendamentos</h3>
            <p className="text-sm text-muted-foreground">
              Gerencie consultas e agende pacientes com facilidade
            </p>
          </div>

          <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
            <h3 className="font-semibold text-lg mb-2">📋 Prontuários</h3>
            <p className="text-sm text-muted-foreground">
              Prontuários eletrônicos completos e seguros
            </p>
          </div>

          <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
            <h3 className="font-semibold text-lg mb-2">💬 WhatsApp</h3>
            <p className="text-sm text-muted-foreground">
              Integração com WhatsApp para lembretes e comunicação
            </p>
          </div>
        </div>

        <div className="mt-12 p-6 bg-secondary rounded-lg">
          <h3 className="font-semibold mb-2">🚀 Status do Sistema</h3>
          <p className="text-sm text-muted-foreground">
            O sistema está em desenvolvimento. Use as credenciais padrão para acessar.
          </p>
        </div>
      </div>
    </div>
  );
}
