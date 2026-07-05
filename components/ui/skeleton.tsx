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
    <div aria-hidden="true" className={cn('flex flex-col gap-sm', className)}>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-center gap-md">
          {Array.from({ length: columns }, (_, col) => (
            <Skeleton key={col} className={cn('h-4', col === 0 ? 'w-1/3' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  );
}
