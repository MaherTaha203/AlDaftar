/**
 * Shared numeric parsing/formatting for the money and quantity components.
 * Single home for Arabic-Indic digit normalization and amount formatting so
 * MoneyInput, QuantityInput, and MoneyDisplay can never drift apart.
 *
 * Precision and grouping locale default to 2 / 'en-US' pending BDR-02 and
 * BDR-17; every function takes them as parameters so the decision lands in
 * one Settings-driven call site later.
 */

const ARABIC_INDIC_ZERO = 0x0660;

/**
 * Normalizes user numeric text to a parseable ASCII string: Arabic-Indic
 * digits → Latin, Arabic decimal separator (٫) → '.', grouping separators
 * (',' '٬' and spaces) removed. Other characters pass through so garbage
 * still fails parsing.
 */
export function normalizeNumericInput(raw: string): string {
  let out = '';
  for (const ch of raw) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= ARABIC_INDIC_ZERO && code <= ARABIC_INDIC_ZERO + 9) {
      out += String(code - ARABIC_INDIC_ZERO);
    } else if (ch === '٫') {
      out += '.';
    } else if (ch !== ',' && ch !== '٬' && ch !== ' ') {
      out += ch;
    }
  }
  return out;
}

/** Parses a non-negative amount; null for empty, negative, or invalid input. */
export function parseAmount(raw: string, precision: number): number | null {
  const cleaned = normalizeNumericInput(raw.trim());
  if (cleaned === '') {
    return null;
  }
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return Number(parsed.toFixed(precision));
}

/** Parses a non-negative quantity; null for empty, negative, or invalid input. */
export function parseQuantity(raw: string): number | null {
  const cleaned = normalizeNumericInput(raw.trim());
  if (cleaned === '') {
    return null;
  }
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/** Formats an amount with grouping and fixed precision; '' for null. */
export function formatAmount(value: number | null, precision: number, locale: string): string {
  if (value === null) {
    return '';
  }
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value);
}

/**
 * Formats an ISO calendar date (`yyyy-mm-dd`) as DD/MM/YYYY — the approved
 * display format (BDR-18 / DL-028). Parses the string parts directly (no
 * `Date`) so the result is timezone-independent and deterministic. Returns
 * '' for null/empty/unparseable input. ISO remains the storage/sort form.
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) {
    return '';
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) {
    return '';
  }
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/**
 * Formats an ISO timestamp as `DD/MM/YYYY HH:mm` (BDR-18) for audit/log
 * surfaces. Date part per {@link formatDate}; time part is read from the ISO
 * string as-is (no timezone conversion) for determinism. Returns '' when the
 * date part is unparseable; omits the time when absent.
 */
export function formatDateTime(iso: string | null | undefined): string {
  const date = formatDate(iso);
  if (!date) {
    return '';
  }
  const time = /T(\d{2}):(\d{2})/.exec(iso ?? '');
  return time ? `${date} ${time[1]}:${time[2]}` : date;
}
