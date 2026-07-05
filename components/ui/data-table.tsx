'use client';

import type { ReactNode } from 'react';
import { cn } from './cn';
import { ChevronDownIcon } from './icons';
import { EmptyState } from './empty-state';
import { TableSkeleton } from './skeleton';
import { uiText } from './ui-text';

/**
 * DataTable — 04_Component_Library.md §3 / 03_UI_Specification.md §3.
 * Generic, business-blind table: columns render given rows; the component
 * never fetches or computes data. RTL by inheritance (first column at the
 * inline start = right). Sorting is controlled-only: the table renders sort
 * indicators and reports clicks; the caller owns the actual ordering.
 * Responsive: columns declare `priority` (1 always visible, 2 hidden below
 * `lg`, 3 hidden below `md`) per 03 §5. A sticky header requires a bounded
 * scroll container, so it activates only when `maxHeight` is set.
 */
export interface DataTableColumn<TRow> {
  key: string;
  header: ReactNode;
  render: (row: TRow) => ReactNode;
  /** Logical alignment; numeric columns use 'left' per 03 §3. */
  align?: 'start' | 'end' | 'left';
  /** Responsive keep-priority: 1 always, 2 hide < lg, 3 hide < md. */
  priority?: 1 | 2 | 3;
  sortable?: boolean;
  width?: string;
}

export interface DataTableSort {
  key: string;
  direction: 'asc' | 'desc';
}

export interface DataTableProps<TRow> {
  columns: readonly DataTableColumn<TRow>[];
  rows: readonly TRow[];
  rowKey: (row: TRow) => string | number;
  onRowClick?: (row: TRow) => void;
  /** Controlled sort state + change callback (caller sorts the rows). */
  sort?: DataTableSort;
  onSortChange?: (sort: DataTableSort) => void;
  /** Per-row action cell rendered in a trailing column. */
  rowActions?: (row: TRow) => ReactNode;
  loading?: boolean;
  /** Rendered when `rows` is empty and not loading. */
  emptyState?: ReactNode;
  /** Keep the header visible while scrolling; requires `maxHeight`. */
  stickyHeader?: boolean;
  /** CSS max-height that turns the table into a vertical scroll container. */
  maxHeight?: string;
  className?: string;
}

const alignClasses = { start: 'text-start', end: 'text-end', left: 'text-left tabular-nums' };
const priorityClasses = { 1: '', 2: 'max-lg:hidden', 3: 'max-md:hidden' };

export function DataTable<TRow>({
  columns,
  rows,
  rowKey,
  onRowClick,
  sort,
  onSortChange,
  rowActions,
  loading = false,
  emptyState,
  stickyHeader = true,
  maxHeight,
  className,
}: DataTableProps<TRow>) {
  const sticky = stickyHeader && maxHeight !== undefined;
  if (loading) {
    return <TableSkeleton columns={Math.min(columns.length, 5)} className={className} />;
  }
  if (rows.length === 0) {
    return <>{emptyState ?? <EmptyState />}</>;
  }

  function handleSortClick(column: DataTableColumn<TRow>) {
    if (!column.sortable || !onSortChange) {
      return;
    }
    const direction = sort?.key === column.key && sort.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ key: column.key, direction });
  }

  return (
    <div
      className={cn('overflow-auto rounded-lg border border-neutral-200', className)}
      style={maxHeight !== undefined ? { maxHeight } : undefined}
    >
      <table className="w-full border-collapse bg-white text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-100">
            {columns.map((column) => {
              const sorted = sort?.key === column.key ? sort.direction : undefined;
              return (
                <th
                  key={column.key}
                  scope="col"
                  style={column.width !== undefined ? { width: column.width } : undefined}
                  aria-sort={
                    sorted === undefined ? undefined : sorted === 'asc' ? 'ascending' : 'descending'
                  }
                  className={cn(
                    'px-md py-sm font-medium text-neutral-500',
                    alignClasses[column.align ?? 'start'],
                    priorityClasses[column.priority ?? 1],
                    sticky && 'sticky top-0 bg-neutral-100',
                  )}
                >
                  {column.sortable && onSortChange ? (
                    <button
                      type="button"
                      onClick={() => handleSortClick(column)}
                      className="inline-flex items-center gap-xs rounded-sm hover:text-neutral-400 focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      {column.header}
                      <ChevronDownIcon
                        width={12}
                        height={12}
                        className={cn(
                          sorted === undefined && 'opacity-30',
                          sorted === 'asc' && 'rotate-180',
                        )}
                      />
                      {sorted !== undefined ? (
                        <span className="sr-only">
                          {sorted === 'asc'
                            ? uiText.table.sortedAscending
                            : uiText.table.sortedDescending}
                        </span>
                      ) : null}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
            {rowActions ? (
              <th scope="col" className="w-px px-md py-sm text-end">
                <span className="sr-only">{uiText.table.actions}</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-b border-neutral-100 last:border-b-0',
                onRowClick && 'cursor-pointer transition-colors hover:bg-neutral-100',
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'px-md py-sm',
                    alignClasses[column.align ?? 'start'],
                    priorityClasses[column.priority ?? 1],
                  )}
                >
                  {column.render(row)}
                </td>
              ))}
              {rowActions ? (
                <td className="px-md py-sm text-end" onClick={(event) => event.stopPropagation()}>
                  {rowActions(row)}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
