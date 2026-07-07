'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from './cn';
import { Button } from './button';
import { inputBaseClasses } from './input';

/**
 * DatePicker — 04_Component_Library.md §1. Built on the native
 * `<input type="date">`: manual entry plus the platform calendar popover,
 * fully accessible and localized by the browser — the ADR-0001-simple
 * choice over a custom calendar. Adds the design's "today" shortcut and
 * min/max bounds. Values are ISO `yyyy-mm-dd` strings (null = empty).
 * Calendar system is Gregorian; a Hijri display companion is pending
 * BDR-18 and would extend, not replace, this component.
 */
export interface DatePickerProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'min' | 'max'
> {
  /** ISO date (yyyy-mm-dd) or null when empty. */
  value: string | null;
  onValueChange: (value: string | null) => void;
  min?: string;
  max?: string;
  invalid?: boolean;
  /** Renders the today shortcut button; label overridable. */
  showToday?: boolean;
  todayLabel?: string;
}

/** Today's local date as an ISO yyyy-mm-dd string. */
function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  {
    value,
    onValueChange,
    min,
    max,
    invalid = false,
    showToday = true,
    todayLabel = 'اليوم',
    className,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <span className={cn('inline-flex w-full items-stretch gap-xs', className)}>
      <input
        ref={ref}
        type="date"
        dir="ltr"
        min={min}
        max={max}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        {...props}
        value={value ?? ''}
        onChange={(event) => onValueChange(event.target.value === '' ? null : event.target.value)}
        className={cn(
          inputBaseClasses,
          'text-left tabular-nums',
          invalid
            ? 'border-danger focus:border-danger focus:shadow-[0_0_0_3px_rgba(194,69,47,0.16)]'
            : 'border-neutral-300',
        )}
      />
      {showToday ? (
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => onValueChange(todayIso())}
          className="h-[var(--ctrl-h)] shrink-0"
        >
          {todayLabel}
        </Button>
      ) : null}
    </span>
  );
});
