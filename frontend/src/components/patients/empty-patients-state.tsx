import { Users } from 'lucide-react';

export function EmptyPatientsState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Users className="h-16 w-16 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Nenhum paciente cadastrado</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Comece adicionando o primeiro paciente ao sistema clicando no botão
        "Novo Paciente" acima.
      </p>
    </div>
  );
}
