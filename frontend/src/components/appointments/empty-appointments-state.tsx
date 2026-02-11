'use client';

import { Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function EmptyAppointmentsState() {
  const router = useRouter();

  return (
    <div className="text-center py-12">
      <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
      <h3 className="mt-4 text-lg font-semibold">Nenhum agendamento para este dia</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Crie um novo agendamento para começar.
      </p>
      <Button
        className="mt-4"
        onClick={() => router.push('/dashboard/appointments/new')}
      >
        <Plus className="h-4 w-4 mr-2" />
        Nova Consulta
      </Button>
    </div>
  );
}
