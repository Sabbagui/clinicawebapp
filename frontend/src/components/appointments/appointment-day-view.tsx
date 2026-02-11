'use client';

import { TIME_SLOTS } from '@/lib/constants/appointment-constants';
import { AppointmentCard } from './appointment-card';
import type { Appointment } from '@/lib/api/endpoints/appointments';

interface AppointmentDayViewProps {
  appointments: Appointment[];
}

export function AppointmentDayView({ appointments }: AppointmentDayViewProps) {
  // Group appointments by their time slot
  const getAppointmentsForSlot = (slot: string) => {
    const [slotHour, slotMinute] = slot.split(':').map(Number);

    return appointments.filter((appt) => {
      const date = new Date(appt.scheduledDate);
      const apptHour = date.getHours();
      const apptMinute = date.getMinutes();

      return apptHour === slotHour && apptMinute === slotMinute;
    });
  };

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {TIME_SLOTS.map((slot) => {
        const slotAppointments = getAppointmentsForSlot(slot);

        return (
          <div
            key={slot}
            className="flex border-b last:border-b-0 min-h-[48px]"
          >
            {/* Time label */}
            <div className="w-16 shrink-0 px-3 py-2 text-sm text-muted-foreground font-mono bg-muted/30 border-r flex items-start justify-end">
              {slot}
            </div>

            {/* Appointments area */}
            <div className="flex-1 p-1 flex flex-col gap-1">
              {slotAppointments.map((appt) => (
                <AppointmentCard key={appt.id} appointment={appt} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
