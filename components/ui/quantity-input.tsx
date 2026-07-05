'use client';

import { forwardRef, useEffect, useState, type FocusEvent, type InputHTMLAttributes } from 'react';
import { cn } from './cn';
import { Button } from './button';
import { parseQuantity } from './format';
import { MinusIcon, PlusIcon } from './icons';
import { inputBaseClasses } from './input';

/**
 * QuantityInput — 04_Component_Library.md §1. Positive-quantity entry with
 * step buttons and an optional unit suffix. The field itself blocks
 * negatives and steps within `min`/`max`; whether zero/over-limits are
 * errors is the form's decision (validation tiers, business architecture
 * R5) — the field reports every parsed value via `onValueChange`.
 */
export interface QuantityInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'min' | 'max'
> {
  value: number | null;
  onValueChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  invalid?: boolean;
  /** Unit label rendered at the inline end (e.g. «قطعة»). */
  unitLabel?: string;
  /** Accessible labels for the step buttons. */
  incrementLabel?: string;
  decrementLabel?: string;
}

export const QuantityInput = forwardRef<HTMLInputElement, QuantityInputProps>(
  function QuantityInput(
    {
      value,
      onValueChange,
      min = 0,
      max,
      step = 1,
      invalid = false,
      unitLabel,
      incrementLabel = 'زيادة',
      decrementLabel = 'إنقاص',
      className,
      onBlur,
      disabled,
      ...props
    },
    ref,
  ) {
    const [draft, setDraft] = useState(value === null ? '' : String(value));

    useEffect(() => {
      setDraft(value === null ? '' : String(value));
    }, [value]);

    function commit(next: number | null) {
      const bounded =
        next === null ? null : Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min, next));
      onValueChange(bounded);
      setDraft(bounded === null ? '' : String(bounded));
    }

    function handleBlur(event: FocusEvent<HTMLInputElement>) {
      commit(parseQuantity(draft));
      onBlur?.(event);
    }

    function stepBy(delta: number) {
      commit((value ?? 0) + delta);
    }

    return (
      <span className="inline-flex w-full items-stretch gap-xs">
        <Button
          variant="secondary"
          size="sm"
          aria-label={decrementLabel}
          disabled={disabled || (value !== null && value <= min)}
          onClick={() => stepBy(-step)}
          className="h-10 shrink-0"
          icon={<MinusIcon />}
        />
        <span className="relative inline-block w-full">
          <input
            ref={ref}
            inputMode="decimal"
            dir="ltr"
            aria-invalid={invalid || undefined}
            disabled={disabled}
            {...props}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={handleBlur}
            className={cn(
              inputBaseClasses,
              'text-center tabular-nums',
              invalid ? 'border-danger focus:outline-danger' : 'border-neutral-300',
              unitLabel !== undefined && 'pe-xl',
              className,
            )}
          />
          {unitLabel !== undefined ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute end-md top-1/2 -translate-y-1/2 text-xs text-neutral-400"
            >
              {unitLabel}
            </span>
          ) : null}
        </span>
        <Button
          variant="secondary"
          size="sm"
          aria-label={incrementLabel}
          disabled={disabled || (max !== undefined && value !== null && value >= max)}
          onClick={() => stepBy(step)}
          className="h-10 shrink-0"
          icon={<PlusIcon />}
        />
      </span>
    );
  },
);
