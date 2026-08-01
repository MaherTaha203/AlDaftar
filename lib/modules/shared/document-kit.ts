import { ErrorFactory } from '@/lib/core';

/**
 * Document kit — the shared infrastructure of the Derived Document Framework
 * (BDD-011 / DL-036), built by COMPOSITION: small pure helpers every document
 * service calls, never a base class and never a generic table. Each document
 * type keeps its own table (parity-first), model, service, and screens.
 *
 * Only helpers with at least two real consumers live here (the framework's
 * own guard against ERP-style over-abstraction). The derived-document lookup
 * and the Document History builder join in their consuming phases per the
 * BDD-011 implementation plan.
 *
 * Retires the TD-006 `nextNumber()` duplication.
 */

/** The one field the numbering rule needs from any document. */
interface NumberedRecord {
  readonly number: number | null;
}

/**
 * Next document number under the approved numbering policy (BDD-005 /
 * BDR-01): independent plain-integer sequence per document type, starting at
 * 1, never reset, never reused, assigned only at posting. Drafts carry
 * `number: null` and are ignored.
 */
export function nextDocumentNumber(records: readonly NumberedRecord[]): number {
  return records.reduce((max, r) => (r.number !== null && r.number > max ? r.number : max), 0) + 1;
}

/** The two fields the lifecycle guard needs from any document. */
interface LifecycleRecord {
  readonly id: string;
  readonly status: string;
}

/**
 * The immutability guard (01 §0.1, BDD-011): every mutating service method
 * calls this first, so a document past its draft state can never be edited,
 * posted twice, or deleted. `immutableMessage` names the document type's own
 * rule (e.g. «Posted purchases are immutable»).
 */
export function assertMutableDraft(
  record: LifecycleRecord,
  draftStatus: string,
  immutableMessage: string,
): void {
  if (record.status !== draftStatus) {
    throw ErrorFactory.conflict(immutableMessage, { id: record.id });
  }
}

/**
 * Aggregates prior consumption per key from a set of events — the shared
 * half of every remaining-basis cap (BDD-011): returned quantity per
 * purchase line, credited value per purchase, refunded cash per payment.
 * The caller filters the events (posted only, right parent) and states what
 * each event contributes.
 */
export function consumptionByKey<E>(
  events: readonly E[],
  contributions: (event: E) => Iterable<readonly [key: string, amount: number]>,
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const event of events) {
    for (const [key, amount] of contributions(event)) {
      totals[key] = (totals[key] ?? 0) + amount;
    }
  }
  return totals;
}

/**
 * What is still correctable/returnable of a basis after prior consumption —
 * never below zero, so a cap check reads `requested > remainingBasis(...)`.
 */
export function remainingBasis(total: number, consumed: number): number {
  return Math.max(0, total - consumed);
}
