/**
 * Money rules — the approved BDR-02 decision as code (BDD-006, DL-014):
 * single bookkeeping currency ILS, 2 decimal places, half-up rounding.
 * The single home for amount math in business modules; UI components take
 * these values as props (MoneyInput/MoneyDisplay precision + currency label).
 */
export const BOOK_CURRENCY = Object.freeze({
  code: 'ILS',
  symbol: '₪',
  precision: 2,
});

/** Half-up rounding to the approved 2 decimal places. */
export function roundAmount(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** quantity × unit price, rounded per line (frozen purchase architecture 03). */
export function computeLineTotal(quantity: number, unitPrice: number): number {
  return roundAmount(quantity * unitPrice);
}

/** Sums already-rounded amounts and rounds the result. */
export function sumAmounts(values: readonly number[]): number {
  return roundAmount(values.reduce((total, value) => total + value, 0));
}
