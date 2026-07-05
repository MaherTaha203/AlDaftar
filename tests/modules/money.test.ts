import { describe, expect, it } from 'vitest';
import {
  BOOK_CURRENCY,
  computeLineTotal,
  roundAmount,
  sumAmounts,
} from '@/lib/modules/shared/money';

/*
 * Asserts the APPROVED money math (BDR-02 / BDD-006 / DL-014): single currency
 * ILS, 2 decimals, half-up rounding. No pending decision is exercised here.
 */

describe('BOOK_CURRENCY', () => {
  it('is the approved ILS / 2-decimal currency and is frozen', () => {
    expect(BOOK_CURRENCY.code).toBe('ILS');
    expect(BOOK_CURRENCY.symbol).toBe('₪');
    expect(BOOK_CURRENCY.precision).toBe(2);
    expect(Object.isFrozen(BOOK_CURRENCY)).toBe(true);
  });
});

describe('roundAmount — half-up to 2 decimals', () => {
  it('rounds halves up, correcting binary-float representation', () => {
    expect(roundAmount(0.005)).toBe(0.01);
    expect(roundAmount(1.005)).toBe(1.01);
    expect(roundAmount(2.675)).toBe(2.68);
  });

  it('rounds below the half down', () => {
    expect(roundAmount(1.234)).toBe(1.23);
    expect(roundAmount(1.2349)).toBe(1.23);
  });

  it('leaves already-2dp values unchanged', () => {
    expect(roundAmount(7.5)).toBe(7.5);
    expect(roundAmount(0)).toBe(0);
  });
});

describe('computeLineTotal', () => {
  it('multiplies quantity by unit price and rounds', () => {
    expect(computeLineTotal(3, 2.5)).toBe(7.5);
    expect(computeLineTotal(0.1, 0.2)).toBe(0.02);
    expect(computeLineTotal(2, 3.335)).toBe(6.67);
  });
});

describe('sumAmounts', () => {
  it('sums and rounds, absorbing float drift', () => {
    expect(sumAmounts([0.1, 0.2])).toBe(0.3);
    expect(sumAmounts([1.11, 2.22, 3.33])).toBe(6.66);
  });

  it('an empty list sums to zero', () => {
    expect(sumAmounts([])).toBe(0);
  });
});
