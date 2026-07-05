import { sumAmounts } from '../shared/money';

/**
 * Payments module — types, per the frozen Payments Architecture
 * (docs/payments/01–07): Draft→Posted document reusing the purchase model;
 * amount + separate payment-time discount, both crediting the calculated
 * supplier balance (running-balance model, BDR-04/DL-016 — no allocation);
 * free-text method (BDR-05/DL-016); ILS amounts (BDR-02); per-type plain
 * number at posting (BDR-01). Correction of a posted payment is deferred
 * (BDR-07).
 */
export const PaymentStatus = {
  Draft: 'draft',
  Posted: 'posted',
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export interface Payment {
  readonly id: string;
  /** Official number — null until posted; Payment type's own sequence. */
  readonly number: number | null;
  readonly status: PaymentStatus;
  readonly supplierId: string;
  readonly date: string;
  /** Cash paid, ILS > 0. */
  readonly amount: number;
  /** Settlement discount granted at payment, ILS ≥ 0 (separate credit). */
  readonly discount: number;
  /** Payment method — free-text for now (BDR-05). */
  readonly method: string;
  /** Method reference (transfer/cheque no.); may be empty. */
  readonly reference: string;
  readonly notes: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly postedAt: string | null;
}

export interface PaymentDraftInput {
  readonly supplierId: string;
  readonly date: string;
  readonly amount: number | null;
  readonly discount?: number | null;
  readonly method: string;
  readonly reference?: string;
  readonly notes?: string;
}

/** Total credit to the supplier = amount + discount (both reduce the balance). */
export function paymentTotalCredit(payment: Pick<Payment, 'amount' | 'discount'>): number {
  return sumAmounts([payment.amount, payment.discount]);
}
