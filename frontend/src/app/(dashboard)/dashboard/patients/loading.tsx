import { Skeleton } from '@/components/ui/skeleton';

export default function PatientsLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header + search + button */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-36" />
      </div>
      <Skeleton className="h-9 w-72" />

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-5 gap-4 px-4 py-3 bg-muted/50">
          {['Nome', 'CPF', 'Telefone', 'Cidade', 'Ações'].map((col) => (
            <Skeleton key={col} className="h-4 w-full max-w-[80px]" />
          ))}
        </div>
        {/* Data rows */}
        <div className="divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-5 gap-4 items-center px-4 py-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <div className="flex gap-2">
                <Skeleton className="h-7 w-16 rounded-md" />
                <Skeleton className="h-7 w-16 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
