import { describe, expect, it } from 'vitest';
import { isValidIsoDate } from '@/lib/modules/shared/dates';

/**
 * isValidIsoDate (DL-023): the storage-form date guard used before a document
 * posts. Accepts only a well-formed, real `yyyy-mm-dd`; rejects empty,
 * malformed, and impossible calendar dates.
 */
describe('isValidIsoDate', () => {
  it('accepts a well-formed real date', () => {
    expect(isValidIsoDate('2026-07-05')).toBe(true);
    expect(isValidIsoDate('2024-02-29')).toBe(true); // leap year
  });

  it('rejects impossible calendar dates', () => {
    expect(isValidIsoDate('2026-13-45')).toBe(false);
    expect(isValidIsoDate('2026-02-30')).toBe(false);
    expect(isValidIsoDate('2026-02-29')).toBe(false); // 2026 is not a leap year
  });

  it('rejects malformed, empty, and non-string input', () => {
    expect(isValidIsoDate('')).toBe(false);
    expect(isValidIsoDate('2026-7-5')).toBe(false); // must be zero-padded
    expect(isValidIsoDate('05/07/2026')).toBe(false);
    expect(isValidIsoDate('2026-07-05T00:00:00Z')).toBe(false);
    expect(isValidIsoDate(null)).toBe(false);
    expect(isValidIsoDate(undefined)).toBe(false);
    expect(isValidIsoDate(20260705)).toBe(false);
  });
});
