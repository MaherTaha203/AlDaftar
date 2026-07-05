'use client';

import type { ReactNode } from 'react';
import { PageLayout } from '../app';
import { Toolbar } from '../layout';
import {
  DataTable,
  EmptyState,
  ErrorState,
  Pagination,
  SearchBox,
  type DataTableColumn,
  type DataTableSort,
  type PaginationProps,
} from '../ui';

/**
 * ListPage — the Business Framework list-screen template. Every module list
 * (S-10, S-20, S-30, …) is an instance of this composition, per the standard
 * pattern in 03_UI_Specification.md §1: title row (+ primary action) →
 * toolbar (search / filter chrome) → table → pagination.
 *
 * Business-blind and data-agnostic: rows, columns, filtering, and pagination
 * state are owned by the module; this template owns only the wiring of the
 * loading / error / empty / data states so all lists behave identically.
 */
export interface ListPageSearch {
  onQueryChange: (query: string) => void;
  initialQuery?: string;
  placeholder?: string;
}

export interface ListPageProps<TRow> {
  /** Page heading override; defaults to the route title. */
  title?: ReactNode;
  /** Primary action(s) in the title row (e.g. the create Button). */
  primaryAction?: ReactNode;
  /** In-list search wiring; omitted = no search box. */
  search?: ListPageSearch;
  /** End-of-toolbar actions (filter toggle, print, export). */
  toolbarActions?: ReactNode;
  /** Filter chrome (FilterPanel) rendered under the toolbar. */
  filters?: ReactNode;
  columns: readonly DataTableColumn<TRow>[];
  rows: readonly TRow[];
  rowKey: (row: TRow) => string | number;
  onRowClick?: (row: TRow) => void;
  sort?: DataTableSort;
  onSortChange?: (sort: DataTableSort) => void;
  rowActions?: (row: TRow) => ReactNode;
  loading?: boolean;
  /** Arabic load-failure message; renders ErrorState with retry. */
  error?: string | null;
  onRetry?: () => void;
  /** Empty-state copy + optional action (create / clear filters). */
  emptyMessage?: string;
  emptyAction?: ReactNode;
  pagination?: PaginationProps;
}

export function ListPage<TRow>({
  title,
  primaryAction,
  search,
  toolbarActions,
  filters,
  columns,
  rows,
  rowKey,
  onRowClick,
  sort,
  onSortChange,
  rowActions,
  loading = false,
  error = null,
  onRetry,
  emptyMessage,
  emptyAction,
  pagination,
}: ListPageProps<TRow>) {
  const showToolbar = search !== undefined || toolbarActions !== undefined;

  return (
    <PageLayout
      title={title}
      actions={primaryAction}
      toolbar={
        showToolbar || filters !== undefined ? (
          <>
            {showToolbar ? (
              <Toolbar
                search={
                  search !== undefined ? (
                    <SearchBox
                      onQueryChange={search.onQueryChange}
                      initialQuery={search.initialQuery}
                      placeholder={search.placeholder}
                    />
                  ) : undefined
                }
                actions={toolbarActions}
              />
            ) : null}
            {filters}
          </>
        ) : undefined
      }
      footer={
        pagination !== undefined && error === null && !loading ? (
          <Pagination {...pagination} />
        ) : undefined
      }
    >
      {error !== null ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={rowKey}
          onRowClick={onRowClick}
          sort={sort}
          onSortChange={onSortChange}
          rowActions={rowActions}
          loading={loading}
          emptyState={<EmptyState message={emptyMessage} action={emptyAction} />}
        />
      )}
    </PageLayout>
  );
}
