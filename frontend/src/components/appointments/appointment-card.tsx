'use client';

import { useRouter } from 'next/navigation';
import { AppointmentStatusBadge } from './appointment-status-badge';
import { formatTime } from '@/lib/utils';
import type { Appointment } from '@/lib/api/endpoints/appointments';

interface AppointmentCardProps {
  appointment: Appointment;
}

export function AppointmentCard({ appointment }: AppointmentCardProps) {
  const router = useRouter();

  const statusBorderColors: Record<string, string> = {
    SCHEDULED: 'border-l-blue-500',
    CONFIRMED: 'border-l-green-500',
    IN_PROGRESS: 'border-l-yellow-500',
    COMPLETED: 'border-l-gray-400',
    CANCELLED: 'border-l-red-500',
    NO_SHOW: 'border-l-orange-500',
  };

  const borderColor = statusBorderColors[appointment.status] || 'border-l-gray-300';

  return (
    <div
      className={`border border-l-4 ${borderColor} rounded-md p-3 bg-card hover:shadow-md transition-shadow cursor-pointer`}
      onClick={() => router.push(`/dashboard/appointments/${appointment.id}`)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{appointment.patient.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatTime(appointment.scheduledDate)} - {appointment.type} ({appointment.duration}min)
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {appointment.doctor.name}
          </p>
        </div>
        <AppointmentStatusBadge status={appointment.status} />
      </div>
    </div>
  );
}
