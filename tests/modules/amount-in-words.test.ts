import { describe, expect, it } from 'vitest';
import { amountInWords, integerToArabicWords } from '@/lib/modules/shared/amount-in-words';

/**
 * amount-in-words (BDR-19 / DL-029): asserts the pure Arabic-wording algorithm.
 * Structural correctness of the decomposition and the ILS currency wrapper —
 * no pending business decision is exercised.
 */
describe('integerToArabicWords', () => {
  it('handles zero and single digits', () => {
    expect(integerToArabicWords(0)).toBe('صفر');
    expect(integerToArabicWords(1)).toBe('واحد');
    expect(integerToArabicWords(9)).toBe('تسعة');
  });

  it('handles ten, teens, and tens with units (units before tens with waw)', () => {
    expect(integerToArabicWords(10)).toBe('عشرة');
    expect(integerToArabicWords(11)).toBe('أحد عشر');
    expect(integerToArabicWords(20)).toBe('عشرون');
    expect(integerToArabicWords(21)).toBe('واحد وعشرون');
    expect(integerToArabicWords(99)).toBe('تسعة وتسعون');
  });

  it('handles hundreds joined to the remainder with waw', () => {
    expect(integerToArabicWords(100)).toBe('مائة');
    expect(integerToArabicWords(200)).toBe('مئتان');
    expect(integerToArabicWords(300)).toBe('ثلاثمائة');
    expect(integerToArabicWords(121)).toBe('مائة وواحد وعشرون');
  });

  it('handles thousands with singular/dual/plural scale words', () => {
    expect(integerToArabicWords(1000)).toBe('ألف');
    expect(integerToArabicWords(2000)).toBe('ألفان');
    expect(integerToArabicWords(3000)).toBe('ثلاثة آلاف');
    expect(integerToArabicWords(11000)).toBe('أحد عشر ألف');
    expect(integerToArabicWords(1234)).toBe('ألف ومئتان وأربعة وثلاثون');
  });

  it('handles millions', () => {
    expect(integerToArabicWords(1000000)).toBe('مليون');
    expect(integerToArabicWords(2000000)).toBe('مليونان');
  });
});

describe('amountInWords (ILS)', () => {
  it('wholes only use شيكل with no agora clause', () => {
    expect(amountInWords(0)).toBe('صفر شيكل');
    expect(amountInWords(100)).toBe('مائة شيكل');
  });

  it('adds an agora clause for the fractional part', () => {
    expect(amountInWords(100.5)).toBe('مائة شيكل وخمسون أغورة');
    expect(amountInWords(1.25)).toBe('واحد شيكل وخمسة وعشرون أغورة');
  });

  it('rounds half-up to the currency precision before wording', () => {
    // 0.005 → 0.01 → one agora
    expect(amountInWords(0.005)).toBe('صفر شيكل وواحد أغورة');
  });

  it('treats negative magnitudes as their absolute value', () => {
    expect(amountInWords(-50)).toBe('خمسون شيكل');
  });
});
