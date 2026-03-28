import { Skeleton } from '@/components/ui/skeleton';

export default function FinanceLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header + period filter */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-36" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>

      {/* 4 KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-5 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Bar chart area */}
      <div className="rounded-lg border p-5 space-y-4">
        <Skeleton className="h-5 w-40" />
        {/* Y-axis labels + bars */}
        <div className="flex gap-3 items-end h-48">
          <div className="flex flex-col justify-between h-full py-1 shrink-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-10" />
            ))}
          </div>
          <div className="flex-1 flex items-end gap-2 h-full">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col gap-1 items-center justify-end h-full">
                <Skeleton
                  className="w-full rounded-t"
                  style={{ height: `${40 + (i % 3) * 25}%` }}
                />
                <Skeleton className="h-3 w-8 mt-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
