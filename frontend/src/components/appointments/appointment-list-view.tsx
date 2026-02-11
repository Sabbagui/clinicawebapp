'use client';

import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AppointmentStatusBadge } from './appointment-status-badge';
import { formatTime } from '@/lib/utils';
import { Eye } from 'lucide-react';
import type { Appointment } from '@/lib/api/endpoints/appointments';

interface AppointmentListViewProps {
  appointments: Appointment[];
}

export function AppointmentListView({ appointments }: AppointmentListViewProps) {
  const router = useRouter();

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Horário</TableHead>
            <TableHead>Paciente</TableHead>
            <TableHead>Médico(a)</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Duração</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((appt) => (
            <TableRow key={appt.id}>
              <TableCell className="font-mono">
                {formatTime(appt.scheduledDate)}
              </TableCell>
              <TableCell className="font-medium">{appt.patient.name}</TableCell>
              <TableCell>{appt.doctor.name}</TableCell>
              <TableCell>{appt.type}</TableCell>
              <TableCell>{appt.duration}min</TableCell>
              <TableCell>
                <AppointmentStatusBadge status={appt.status} />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push(`/dashboard/appointments/${appt.id}`)}
                  title="Ver detalhes"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
