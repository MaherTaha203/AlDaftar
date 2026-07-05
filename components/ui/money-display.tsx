import { cn } from './cn';
import { formatAmount } from './format';

/**
 * MoneyDisplay — 04_Component_Library.md §1. Read-only formatted amount:
 * tabular numerals, grouping, fixed precision (defaults pending BDR-02 /
 * BDR-17, same knobs as MoneyInput via the shared `format.ts`), optional
 * currency label, optional sign colorization for balances. Rendered
 * LTR-isolated inside RTL text per 03 §6.3. Null renders an em dash.
 */
export interface MoneyDisplayProps {
  value: number | null;
  precision?: number;
  formatLocale?: string;
  /** Currency label rendered after the amount (e.g. from Settings). */
  currencyLabel?: string;
  /** Colorize by sign: positive → success, negative → danger. */
  colorizeSign?: boolean;
  className?: string;
}

export function MoneyDisplay({
  value,
  precision = 2,
  formatLocale = 'en-US',
  currencyLabel,
  colorizeSign = false,
  className,
}: MoneyDisplayProps) {
  const text = value === null ? '—' : formatAmount(value, precision, formatLocale);
  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-xs tabular-nums',
        colorizeSign && value !== null && value > 0 && 'text-success',
        colorizeSign && value !== null && value < 0 && 'text-danger',
        className,
      )}
    >
      <bdi dir="ltr">{text}</bdi>
      {currencyLabel !== undefined && value !== null ? (
        <span className="text-xs text-neutral-400">{currencyLabel}</span>
      ) : null}
    </span>
  );
}
