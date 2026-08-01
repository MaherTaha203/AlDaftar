import { describe, expect, it } from 'vitest';
import {
  assertMutableDraft,
  consumptionByKey,
  nextDocumentNumber,
  remainingBasis,
} from '@/lib/modules/shared/document-kit';

/*
 * Asserts the shared infrastructure of the Derived Document Framework
 * (BDD-011 / DL-036): the approved numbering rule (BDD-005 / BDR-01), the
 * posted-immutability guard (01 §0.1), and the remaining-basis cap helpers.
 * Pure logic only — no pending decision is exercised.
 */

describe('nextDocumentNumber — BDD-005 sequence', () => {
  it('starts at 1 on an empty book', () => {
    expect(nextDocumentNumber([])).toBe(1);
  });

  it('ignores drafts (number null) and continues past the highest posted number', () => {
    expect(
      nextDocumentNumber([{ number: 2 }, { number: null }, { number: 7 }, { number: 4 }]),
    ).toBe(8);
  });

  it('never reuses a gap — the sequence only moves forward', () => {
    // 2 was never assigned (e.g. an aborted post); the next number is still 4.
    expect(nextDocumentNumber([{ number: 1 }, { number: 3 }])).toBe(4);
  });

  it('is draft-only-proof: an all-draft book still yields 1', () => {
    expect(nextDocumentNumber([{ number: null }, { number: null }])).toBe(1);
  });
});

describe('assertMutableDraft — posted immutability guard', () => {
  it('lets a draft through', () => {
    expect(() =>
      assertMutableDraft({ id: 'a', status: 'draft' }, 'draft', 'Posted X are immutable'),
    ).not.toThrow();
  });

  it('rejects any non-draft state with the document type’s own message', () => {
    expect(() =>
      assertMutableDraft({ id: 'a', status: 'posted' }, 'draft', 'Posted X are immutable'),
    ).toThrowError(/immutable/);
  });
});

describe('consumptionByKey — prior consumption aggregation', () => {
  it('sums contributions per key across events', () => {
    const events = [
      { lines: [{ key: 'L1', qty: 2 }] },
      {
        lines: [
          { key: 'L1', qty: 3 },
          { key: 'L2', qty: 5 },
        ],
      },
    ];
    expect(consumptionByKey(events, (e) => e.lines.map((l) => [l.key, l.qty] as const))).toEqual({
      L1: 5,
      L2: 5,
    });
  });

  it('returns an empty record for no events', () => {
    expect(consumptionByKey([], () => [])).toEqual({});
  });
});

describe('remainingBasis — the cap denominator', () => {
  it('is total minus consumed', () => {
    expect(remainingBasis(10, 4)).toBe(6);
  });

  it('never goes below zero', () => {
    expect(remainingBasis(10, 12)).toBe(0);
  });
});
