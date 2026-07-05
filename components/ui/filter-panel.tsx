'use client';

import type { ReactNode } from 'react';
import { cn } from './cn';
import { Button } from './button';
import { CloseIcon } from './icons';
import { uiText } from './ui-text';

/**
 * FilterPanel — 04_Component_Library.md §2 / 03_UI_Specification.md §3.
 * Presentational filter chrome: an inline collapsible row hosting the
 * caller's filter fields, plus removable active-filter chips and a
 * clear-all action. Filter *state* (including the URL reflection required
 * by 06 §4) is owned by the caller — this component renders and reports.
 */
export interface FilterChip {
  /** Stable key identifying the filter this chip represents. */
  key: string;
  /** Chip text, e.g. «الحالة: مسودة». */
  label: string;
}

export interface FilterPanelProps {
  /** Whether the filter-fields row is expanded (toolbar toggle owns this). */
  open: boolean;
  /** Active filters rendered as removable chips under the toolbar. */
  chips?: readonly FilterChip[];
  onRemoveChip?: (key: string) => void;
  onClearAll?: () => void;
  clearAllLabel?: string;
  removeLabel?: string;
  /** Filter field controls (Select / DatePicker / toggles), laid out by the caller. */
  children: ReactNode;
  className?: string;
}

export function FilterPanel({
  open,
  chips = [],
  onRemoveChip,
  onClearAll,
  clearAllLabel = uiText.clearFilters,
  removeLabel = uiText.clear,
  children,
  className,
}: FilterPanelProps) {
  return (
    <div className={cn('flex flex-col gap-sm', className)}>
      {open ? (
        <div className="flex flex-wrap items-end gap-md rounded-lg border border-neutral-200 bg-neutral-100/50 p-md">
          {children}
        </div>
      ) : null}
      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-sm">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-xs rounded-full bg-primary/10 ps-sm pe-xs py-xs text-xs text-primary"
            >
              {chip.label}
              {onRemoveChip ? (
                <button
                  type="button"
                  aria-label={`${removeLabel}: ${chip.label}`}
                  onClick={() => onRemoveChip(chip.key)}
                  className="rounded-full p-xs hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <CloseIcon width={12} height={12} />
                </button>
              ) : null}
            </span>
          ))}
          {onClearAll ? (
            <Button variant="link" size="sm" onClick={onClearAll}>
              {clearAllLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
