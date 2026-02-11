import { ReactNode } from 'react';

interface PatientDetailSectionProps {
  title: string;
  children: ReactNode;
}

export function PatientDetailSection({ title, children }: PatientDetailSectionProps) {
  return (
    <div className="p-6 border rounded-lg bg-card shadow-sm">
      <h3 className="font-semibold text-lg mb-4 pb-2 border-b">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

interface DetailItemProps {
  label: string;
  value: string | null | undefined;
}

export function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div>
      <span className="text-sm text-muted-foreground">{label}:</span>
      <p className="font-medium">{value || '—'}</p>
    </div>
  );
}
