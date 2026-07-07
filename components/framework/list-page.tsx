'use client';

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { PageLayout } from '../app';
import { recentRow } from '../app/recent-row-store';
import { useShortcut } from '../app/use-shortcut';
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
  /** Ctrl+N handler (create). When omitted, Ctrl+N opens the command palette. */
  onNew?: () => void;
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
  onNew,
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
  const searchRef = useRef<HTMLInputElement>(null);

  // Ctrl+F focuses the in-page search (falls back to native find where absent);
  // Ctrl+N creates when the page provides a handler.
  useShortcut('search', () => searchRef.current?.focus(), search !== undefined);
  useShortcut('new', () => onNew?.(), onNew !== undefined);

  // Smart Row Highlight (#9): pick up a row marked by a create / edit flow and
  // clear it once the CSS glow has run so it fires exactly once per return.
  const highlightKey = useSyncExternalStore(
    recentRow.subscribe,
    recentRow.getSnapshot,
    recentRow.getServerSnapshot,
  );
  useEffect(() => {
    if (highlightKey == null) {
      return;
    }
    const timer = setTimeout(() => recentRow.clear(), 2400);
    return () => clearTimeout(timer);
  }, [highlightKey]);

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
                      ref={searchRef}
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
          // Bound the table to the viewport so long lists scroll internally
          // with a frozen header (Productivity Sprint #2) instead of pushing
          // the toolbar off-screen. Short lists never reach the cap.
          stickyHeader
          maxHeight="calc(100dvh - 13rem)"
          highlightKey={highlightKey}
          emptyState={<EmptyState message={emptyMessage} action={emptyAction} />}
        />
      )}
    </PageLayout>
  );
}
