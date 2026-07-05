'use client';

import { cn } from './cn';
import { Button } from './button';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import { Select } from './select';
import { uiText } from './ui-text';

/**
 * Pagination — 03_UI_Specification.md §3: page-based, default 25/page
 * (options 25/50/100), shows «عرض n–m من total». RTL arrows: "next" points
 * left (physical), handled here so callers stay logical. Digit style pends
 * BDR-17; numbers are rendered as-is.
 */
export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  className?: string;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
  className,
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label={uiText.page}
      className={cn('flex flex-wrap items-center justify-between gap-md py-md', className)}
    >
      <p className="text-sm text-neutral-500">
        {uiText.paginationOf(String(from), String(to), String(total))}
      </p>
      <div className="flex items-center gap-sm">
        {onPageSizeChange ? (
          <label className="flex items-center gap-sm text-sm text-neutral-500">
            {uiText.pageSize}
            <Select
              value={String(pageSize)}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="w-20"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
          </label>
        ) : null}
        <Button
          variant="secondary"
          size="sm"
          aria-label={uiText.previousPage}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          icon={<ChevronRightIcon />}
        />
        <span className="text-sm text-neutral-500 tabular-nums">
          {page} / {pageCount}
        </span>
        <Button
          variant="secondary"
          size="sm"
          aria-label={uiText.nextPage}
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          icon={<ChevronLeftIcon />}
        />
      </div>
    </nav>
  );
}
