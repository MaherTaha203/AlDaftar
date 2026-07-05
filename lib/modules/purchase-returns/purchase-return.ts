import { computeLineTotal, sumAmounts } from '../shared/money';

/**
 * Purchase Returns module — types, per the frozen Purchase Architecture
 * (docs/purchase/06): a return is its own Draft→Posted document that
 * references exactly one posted purchase; its lines reference the purchase's
 * lines and carry the purchase line's unit price (immutable source), so the
 * credited total is quantity × original price. Standalone returns (no
 * purchase reference) remain Decision Pending and are not modeled.
 */
export const ReturnStatus = {
  Draft: 'draft',
  Posted: 'posted',
} as const;

export type ReturnStatus = (typeof ReturnStatus)[keyof typeof ReturnStatus];

export interface ReturnLine {
  readonly id: string;
  /** The purchase line this return line corrects (frozen 06 §2). */
  readonly purchaseLineId: string;
  readonly productId: string;
  readonly unitId: string;
  readonly quantity: number;
  /** Copied from the (immutable) purchase line at draft creation. */
  readonly unitPrice: number;
}

export interface PurchaseReturn {
  readonly id: string;
  /** Official number — null until posted; RETURN type's own sequence (BDR-01). */
  readonly number: number | null;
  readonly status: ReturnStatus;
  /** The corrected posted purchase (identifier-only reference). */
  readonly purchaseId: string;
  /** Copied from the purchase (a return always belongs to its supplier). */
  readonly supplierId: string;
  readonly date: string;
  readonly notes: string;
  readonly lines: readonly ReturnLine[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly postedAt: string | null;
}

/** Draft payload: quantities per purchase line (zero rows are dropped). */
export interface ReturnDraftInput {
  readonly purchaseId: string;
  readonly date: string;
  readonly notes?: string;
  readonly quantities: Readonly<Record<string, number>>;
}

export function returnLineTotal(line: Pick<ReturnLine, 'quantity' | 'unitPrice'>): number {
  return computeLineTotal(line.quantity, line.unitPrice);
}

export function returnTotal(lines: readonly ReturnLine[]): number {
  return sumAmounts(lines.map(returnLineTotal));
}
