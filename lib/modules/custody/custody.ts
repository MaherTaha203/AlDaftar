/**
 * Custody module (سند استلام بضاعة) — domain types + pure read helpers.
 *
 * A custody voucher documents items physically handed to a person as a trust
 * (عهدة) to be returned later. It is deliberately NOT a sale, purchase,
 * invoice, or inventory movement: it carries NO money, NO totals, NO accounting
 * effect — only quantities delivered and, over time, quantities returned.
 *
 * Model (approved architecture):
 *   • ONE master voucher (`Custody`) the user always works with.
 *   • Each return is a separate, immutable EVENT (`CustodyReturn`) linked to the
 *     voucher — never a second numbered document. The append-only history is
 *     kept forever; a line's returned/remaining quantity is DERIVED from the
 *     return events, never stored on the voucher.
 *
 * Lifecycle stored on the row is minimal — Draft → Issued → Cancelled. The
 * richer status the user sees (Partially/Fully Returned, Overdue) is computed
 * at read time by `presentedStatus()` from the return events + the expected
 * return date, so there is no counter to keep consistent and no background job:
 * "Overdue" is simply true whenever an issued voucher is past its date with
 * items still out.
 */

/** Stored lifecycle — the states that are real decisions, not computable. */
export const CustodyStatus = {
  Draft: 'draft',
  Issued: 'issued',
  Cancelled: 'cancelled',
} as const;

export type CustodyStatus = (typeof CustodyStatus)[keyof typeof CustodyStatus];

/** The status the user sees — derived; a superset of the stored lifecycle. */
export const PresentedCustodyStatus = {
  Draft: 'draft',
  Issued: 'issued',
  PartiallyReturned: 'partially-returned',
  FullyReturned: 'fully-returned',
  Overdue: 'overdue',
  Cancelled: 'cancelled',
} as const;

export type PresentedCustodyStatus =
  (typeof PresentedCustodyStatus)[keyof typeof PresentedCustodyStatus];

export interface CustodyLine {
  readonly id: string;
  /** Free-text item name — intentionally not coupled to the products module. */
  readonly item: string;
  readonly description: string;
  /** Delivered quantity. Returned/remaining are never stored here. */
  readonly quantity: number;
  readonly remarks: string;
}

export interface Custody {
  readonly id: string;
  /** Official number — null until issued; custody's own sequence (starts at 1). */
  readonly number: number | null;
  readonly status: CustodyStatus;
  readonly recipient: string;
  readonly phone: string;
  /** Issue date, ISO yyyy-mm-dd. */
  readonly date: string;
  /** Optional expected return date, ISO yyyy-mm-dd, or null. */
  readonly expectedReturnDate: string | null;
  readonly notes: string;
  readonly lines: readonly CustodyLine[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly issuedAt: string | null;
  readonly cancelledAt: string | null;
}

/** One item's quantity inside a return event. */
export interface CustodyReturnLine {
  /** The custody line this return applies to. */
  readonly custodyLineId: string;
  readonly quantity: number;
}

/**
 * An immutable return event: "on this date, these quantities came back". Never
 * edited or deleted — the permanent custody history is the set of these rows.
 */
export interface CustodyReturn {
  readonly id: string;
  readonly custodyId: string;
  readonly date: string;
  readonly notes: string;
  readonly lines: readonly CustodyReturnLine[];
  readonly createdAt: string;
}

/** Draft save payload. Lines may be empty while drafting (finalized at issue). */
export interface CustodyDraftInput {
  readonly recipient: string;
  readonly phone?: string;
  readonly date: string;
  readonly expectedReturnDate?: string | null;
  readonly notes?: string;
  readonly lines: readonly CustodyLineInput[];
}

export interface CustodyLineInput {
  readonly item: string;
  readonly description?: string;
  readonly quantity: number;
  readonly remarks?: string;
}

/** "Record Return" payload: quantities per custody line (zero rows dropped). */
export interface CustodyReturnInput {
  readonly custodyId: string;
  readonly date: string;
  readonly notes?: string;
  readonly quantities: Readonly<Record<string, number>>;
}

/** Per-line delivered/returned/remaining — the read model for detail + dialog. */
export interface CustodyLineBalance {
  readonly line: CustodyLine;
  readonly delivered: number;
  readonly returned: number;
  readonly remaining: number;
}

// ── Pure derivations (shared by the service and the UI) ──────────────────────

/** custodyLineId → total quantity returned across all events. */
export function returnedByLine(returns: readonly CustodyReturn[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const event of returns) {
    for (const line of event.lines) {
      totals[line.custodyLineId] = (totals[line.custodyLineId] ?? 0) + line.quantity;
    }
  }
  return totals;
}

/** Total delivered across the voucher's lines. */
export function totalDelivered(lines: readonly CustodyLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/** Total returned across all return events. */
export function totalReturned(returns: readonly CustodyReturn[]): number {
  return returns.reduce(
    (sum, event) => sum + event.lines.reduce((s, line) => s + line.quantity, 0),
    0,
  );
}

/** Per-line balances (remaining clamped at zero). */
export function lineBalances(
  custody: Custody,
  returns: readonly CustodyReturn[],
): readonly CustodyLineBalance[] {
  const returned = returnedByLine(returns);
  return custody.lines.map((line) => {
    const back = returned[line.id] ?? 0;
    return {
      line,
      delivered: line.quantity,
      returned: back,
      remaining: Math.max(0, line.quantity - back),
    };
  });
}

/** Fraction returned (0..1). Zero delivered ⇒ 0. */
export function returnProgress(custody: Custody, returns: readonly CustodyReturn[]): number {
  const delivered = totalDelivered(custody.lines);
  if (delivered <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, totalReturned(returns) / delivered));
}

/**
 * The status to show the user, derived from the stored lifecycle + the return
 * events + the expected return date. `today` is an ISO yyyy-mm-dd string passed
 * in by the caller (kept pure — no clock here), and ISO dates compare as
 * strings. "Overdue" needs no cron: it is simply an issued voucher past its
 * expected date with quantity still outstanding.
 */
export function presentedStatus(
  custody: Custody,
  returns: readonly CustodyReturn[],
  today: string,
): PresentedCustodyStatus {
  if (custody.status === CustodyStatus.Draft) {
    return PresentedCustodyStatus.Draft;
  }
  if (custody.status === CustodyStatus.Cancelled) {
    return PresentedCustodyStatus.Cancelled;
  }
  const delivered = totalDelivered(custody.lines);
  const returned = totalReturned(returns);
  if (delivered > 0 && returned >= delivered) {
    return PresentedCustodyStatus.FullyReturned;
  }
  const remaining = delivered - returned;
  if (custody.expectedReturnDate !== null && custody.expectedReturnDate < today && remaining > 0) {
    return PresentedCustodyStatus.Overdue;
  }
  if (returned > 0) {
    return PresentedCustodyStatus.PartiallyReturned;
  }
  return PresentedCustodyStatus.Issued;
}
