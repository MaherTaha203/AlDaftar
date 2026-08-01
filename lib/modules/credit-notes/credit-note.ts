import { roundAmount, sumAmounts } from '../shared/money';

/**
 * Supplier Credit Note «إشعار دائن للمورد» — types, per the approved
 * correction architecture (BDD-011 / DL-036, resolving BDR-07).
 *
 * A credit note is a VALUE-ONLY, DECREASE-ONLY correction document against
 * exactly one posted purchase, under the strict boundary rule: goods
 * physically moved back → Purchase Return; only financial value changes →
 * Supplier Credit Note. It carries a reason (type + optional description)
 * and, optionally, line attributions that break the amount down over the
 * purchase's lines — when present they must sum to the document amount.
 * Draft → Posted lifecycle identical to every financial document; posted
 * notes are immutable and enter the derived supplier balance as credit.
 */
export const CreditNoteStatus = {
  Draft: 'draft',
  Posted: 'posted',
} as const;

export type CreditNoteStatus = (typeof CreditNoteStatus)[keyof typeof CreditNoteStatus];

/** Approved reason vocabulary (BDD-011) — the WHY of the correction. */
export const CreditNoteReason = {
  WrongPrice: 'wrong-price',
  UndeliveredLine: 'undelivered-line',
  SupplierCredit: 'supplier-credit',
  Duplicate: 'duplicate',
  Other: 'other',
} as const;

export type CreditNoteReason = (typeof CreditNoteReason)[keyof typeof CreditNoteReason];

/** Arabic labels for the reason vocabulary (screens + print). */
export const CREDIT_NOTE_REASON_LABELS: Readonly<Record<CreditNoteReason, string>> = {
  [CreditNoteReason.WrongPrice]: 'تصحيح سعر',
  [CreditNoteReason.UndeliveredLine]: 'صنف مفوتر لم يُستلم',
  [CreditNoteReason.SupplierCredit]: 'إشعار من المورد',
  [CreditNoteReason.Duplicate]: 'فاتورة مكررة',
  [CreditNoteReason.Other]: 'سبب آخر',
};

/** Optional value breakdown over the purchase's lines (BDD-011). */
export interface CreditNoteAttribution {
  readonly id: string;
  /** The purchase line this portion of the credit corrects. */
  readonly purchaseLineId: string;
  readonly amount: number;
  readonly note: string;
}

export interface CreditNote {
  readonly id: string;
  /** Official number — null until posted; the type's own sequence (BDR-01). */
  readonly number: number | null;
  readonly status: CreditNoteStatus;
  /** The corrected posted purchase (identifier-only reference, fixed at creation). */
  readonly purchaseId: string;
  /** Copied from the purchase (a note always belongs to its supplier). */
  readonly supplierId: string;
  readonly date: string;
  /** The credited value (> 0). Decrease-only by design — never negative. */
  readonly amount: number;
  readonly reasonType: CreditNoteReason;
  /** Optional free-text description of the reason ('' when omitted). */
  readonly reasonNote: string;
  readonly attributions: readonly CreditNoteAttribution[];
  readonly notes: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly postedAt: string | null;
}

export interface CreditNoteAttributionInput {
  readonly purchaseLineId: string;
  readonly amount: number;
  readonly note?: string;
}

export interface CreditNoteDraftInput {
  readonly purchaseId: string;
  readonly date: string;
  readonly amount: number;
  readonly reasonType: CreditNoteReason;
  readonly reasonNote?: string;
  readonly notes?: string;
  readonly attributions?: readonly CreditNoteAttributionInput[];
}

/** Total credited against a purchase by a set of notes (posted filter is the caller's). */
export function creditNotesTotal(notes: readonly CreditNote[]): number {
  return sumAmounts(notes.map((note) => note.amount));
}

/** Attribution sum, rounded like every book amount (BDR-02). */
export function attributionsTotal(attributions: readonly CreditNoteAttribution[]): number {
  return roundAmount(sumAmounts(attributions.map((a) => a.amount)));
}
