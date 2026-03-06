export const APPOINTMENT_TYPES = [
  { value: 'Consulta', label: 'Consulta' },
  { value: 'Retorno', label: 'Retorno' },
  { value: 'Exame', label: 'Exame' },
] as const;

export const APPOINTMENT_DURATIONS = [
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 45, label: '45 minutos' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1h30' },
  { value: 120, label: '2 horas' },
] as const;

export const TIME_SLOTS: string[] = [];
for (let h = 8; h < 18; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

export const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  SCHEDULED: { label: 'Agendado', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  CONFIRMED: { label: 'Confirmado', color: 'text-green-700', bgColor: 'bg-green-100' },
  CHECKED_IN: { label: 'Check-in', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  IN_PROGRESS: { label: 'Em Atendimento', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  COMPLETED: { label: 'Concluído', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  CANCELLED: { label: 'Cancelado', color: 'text-red-700', bgColor: 'bg-red-100' },
  NO_SHOW: { label: 'Não Compareceu', color: 'text-red-100', bgColor: 'bg-red-900' },
};

export const STATUS_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ['CONFIRMED', 'CANCELLED', 'NO_SHOW'],
  CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
  CHECKED_IN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED'],
};
