import { cn } from './cn';

/**
 * Skeleton — loading placeholders per 03_UI_Specification.md §7: tables show
 * skeleton rows, dashboards show skeleton tiles; no full-page spinners after
 * first paint. `TableSkeleton` renders the standard 5-row table placeholder.
 */
export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('block animate-pulse rounded-md bg-neutral-200', className)}
    />
  );
}

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, columns = 4, className }: TableSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('flex flex-col gap-sm rounded-lg border border-neutral-200 p-md', className)}
    >
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-center gap-md py-1">
          {Array.from({ length: columns }, (_, col) => (
            <Skeleton key={col} className={cn('h-4', col === 0 ? 'w-1/3' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Card-shaped placeholder — a titled surface with a few text lines. */
export function CardSkeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex flex-col gap-sm rounded-lg border border-neutral-200 bg-white p-lg',
        className,
      )}
    >
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

/** Dashboard stat-tile grid placeholder. */
export function StatGridSkeleton({ tiles = 5, className }: { tiles?: number; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3', className)}
    >
      {Array.from({ length: tiles }, (_, tile) => (
        <div
          key={tile}
          className="flex flex-col gap-sm rounded-lg border border-neutral-200 bg-white p-lg"
        >
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-7 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** Form placeholder — a stack of label + field rows inside a surface. */
export function FormSkeleton({ fields = 4, className }: { fields?: number; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex flex-col gap-md rounded-lg border border-neutral-200 bg-white p-lg',
        className,
      )}
    >
      {Array.from({ length: fields }, (_, field) => (
        <div key={field} className="flex flex-col gap-xs">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-[var(--ctrl-h)] w-full" />
        </div>
      ))}
    </div>
  );
}
