'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { STATUS_TRANSITIONS, STATUS_CONFIG } from '@/lib/constants/appointment-constants';
import { useAppointmentStore } from '@/lib/stores/appointment-store';
import { Loader2 } from 'lucide-react';

interface AppointmentStatusActionsProps {
  appointmentId: string;
  currentStatus: string;
}

export function AppointmentStatusActions({
  appointmentId,
  currentStatus,
}: AppointmentStatusActionsProps) {
  const { changeStatus } = useAppointmentStore();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  const transitions = STATUS_TRANSITIONS[currentStatus] || [];

  if (transitions.length === 0) return null;

  const needsConfirmation = (status: string) =>
    status === 'CANCELLED' || status === 'NO_SHOW';

  const handleStatusChange = async (status: string) => {
    if (needsConfirmation(status) && showConfirm !== status) {
      setShowConfirm(status);
      return;
    }

    setIsUpdating(status);
    setShowConfirm(null);
    try {
      await changeStatus(appointmentId, status);
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Alterar Status:</h4>
      <div className="flex flex-wrap gap-2">
        {transitions.map((status) => {
          const config = STATUS_CONFIG[status];
          const isDestructive = status === 'CANCELLED' || status === 'NO_SHOW';

          return (
            <div key={status} className="flex flex-col gap-1">
              <Button
                size="sm"
                variant={isDestructive ? 'outline' : 'default'}
                className={isDestructive ? 'text-destructive hover:text-destructive' : ''}
                onClick={() => handleStatusChange(status)}
                disabled={isUpdating !== null}
              >
                {isUpdating === status && (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                )}
                {config?.label || status}
              </Button>

              {showConfirm === status && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleStatusChange(status)}
                  >
                    Confirmar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowConfirm(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
