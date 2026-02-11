import { cn } from '@/lib/utils';
import { STATUS_CONFIG } from '@/lib/constants/appointment-constants';

interface AppointmentStatusBadgeProps {
  status: string;
  className?: string;
}

export function AppointmentStatusBadge({ status, className }: AppointmentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.bgColor,
        config.color,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
