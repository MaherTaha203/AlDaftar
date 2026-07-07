'use client';

import { forwardRef, useEffect, useState, type FocusEvent, type InputHTMLAttributes } from 'react';
import { cn } from './cn';
import { formatAmount, parseAmount } from './format';
import { inputBaseClasses } from './input';

/**
 * MoneyInput — 04_Component_Library.md §1 (Currency Input).
 * Controlled amount entry: raw digits while focused, grouped formatting on
 * blur. Never accepts negatives (credits are separate documents by design).
 * `precision` defaults to 2 — configurable because rounding/precision rules
 * are pending BDR-02; digit grouping locale is a prop for the same reason
 * (BDR-17). Arabic-Indic digits typed by the user are normalized on parse.
 */
export interface MoneyInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> {
  value: number | null;
  onValueChange: (value: number | null) => void;
  /** Decimal places kept and displayed (pending BDR-02). */
  precision?: number;
  /** Grouping/format locale for the blurred display (pending BDR-17). */
  formatLocale?: string;
  invalid?: boolean;
  /** Currency label rendered at the inline end (e.g. from Settings). */
  currencyLabel?: string;
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  {
    value,
    onValueChange,
    precision = 2,
    formatLocale = 'en-US',
    invalid = false,
    currencyLabel,
    className,
    onFocus,
    onBlur,
    ...props
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!focused) {
      setDraft(formatAmount(value, precision, formatLocale));
    }
  }, [value, precision, formatLocale, focused]);

  function handleFocus(event: FocusEvent<HTMLInputElement>) {
    setFocused(true);
    setDraft(value === null ? '' : String(value));
    onFocus?.(event);
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    setFocused(false);
    const parsed = parseAmount(draft, precision);
    onValueChange(parsed);
    setDraft(formatAmount(parsed, precision, formatLocale));
    onBlur?.(event);
  }

  return (
    // dir="ltr" so the label's inline-end matches the LTR input's `pe-xl`
    // padding side — otherwise the label overlays the start of the amount.
    <span dir="ltr" className="relative inline-block w-full">
      <input
        ref={ref}
        inputMode="decimal"
        dir="ltr"
        aria-invalid={invalid || undefined}
        {...props}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(
          inputBaseClasses,
          'text-left tabular-nums',
          invalid
            ? 'border-danger focus:border-danger focus:shadow-[0_0_0_3px_rgba(194,69,47,0.16)]'
            : 'border-neutral-300',
          currencyLabel !== undefined && 'pe-xl',
          className,
        )}
      />
      {currencyLabel !== undefined ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute end-md top-1/2 -translate-y-1/2 text-xs text-neutral-400"
        >
          {currencyLabel}
        </span>
      ) : null}
    </span>
  );
});
