import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime } from '@/components/ui/format';

/**
 * formatDate / formatDateTime (BDR-18 / DL-028): DD/MM/YYYY presentation of the
 * ISO storage form. Pure string parsing — timezone-independent, deterministic.
 */
describe('formatDate', () => {
  it('renders ISO yyyy-mm-dd as DD/MM/YYYY', () => {
    expect(formatDate('2026-07-04')).toBe('04/07/2026');
    expect(formatDate('2026-12-31')).toBe('31/12/2026');
  });

  it('accepts a full ISO timestamp and keeps only the date', () => {
    expect(formatDate('2026-07-04T09:30:00.000Z')).toBe('04/07/2026');
  });

  it('returns empty string for null, empty, or unparseable input', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('')).toBe('');
    expect(formatDate('not-a-date')).toBe('');
  });
});

describe('formatDateTime', () => {
  it('appends HH:mm when the ISO string carries a time', () => {
    expect(formatDateTime('2026-07-04T09:30:15.000Z')).toBe('04/07/2026 09:30');
  });

  it('falls back to the date alone when there is no time part', () => {
    expect(formatDateTime('2026-07-04')).toBe('04/07/2026');
  });

  it('returns empty string when the date is unparseable', () => {
    expect(formatDateTime('nope')).toBe('');
  });
});
