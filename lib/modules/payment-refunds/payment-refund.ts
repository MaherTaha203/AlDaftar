import { roundAmount, sumAmounts } from '../shared/money';

/**
 * Payment Refund «سند استرداد دفعة» — types, per the approved correction
 * architecture (BDD-011 / DL-036, resolving BDR-07).
 *
 * A refund records money returned by the supplier against exactly one posted
 * payment — the payment itself is never edited. It mirrors the payment's TWO
 * credit components so a wrong payment can be fully reversed without leaving
 * a phantom credit: `amount` (cash refunded, capped at the payment's cash
 * minus prior posted refunds) and `discountReversal` (cancels payment-time
 * discount, capped at the payment's discount minus prior posted reversals).
 * At least one must be positive. Carries a reason (type + optional
 * description). Draft → Posted lifecycle; posted refunds are immutable and
 * enter the derived supplier balance as debit.
 */
export const PaymentRefundStatus = {
  Draft: 'draft',
  Posted: 'posted',
  /** Reversal-cancelled (BDD-011 amendment): content frozen, effect removed. */
  Cancelled: 'cancelled',
} as const;

export type PaymentRefundStatus = (typeof PaymentRefundStatus)[keyof typeof PaymentRefundStatus];

/** Approved reason vocabulary (BDD-011) — the WHY of the refund. */
export const PaymentRefundReason = {
  MoneyReturned: 'money-returned',
  WrongSupplier: 'wrong-supplier',
  Overpaid: 'overpaid',
  Duplicate: 'duplicate',
  WrongDiscount: 'wrong-discount',
  Other: 'other',
} as const;

export type PaymentRefundReason = (typeof PaymentRefundReason)[keyof typeof PaymentRefundReason];

/** Arabic labels for the reason vocabulary (screens + print). */
export const PAYMENT_REFUND_REASON_LABELS: Readonly<Record<PaymentRefundReason, string>> = {
  [PaymentRefundReason.MoneyReturned]: 'إرجاع مبلغ من المورد',
  [PaymentRefundReason.WrongSupplier]: 'دفعة لمورد خاطئ',
  [PaymentRefundReason.Overpaid]: 'مبلغ زائد',
  [PaymentRefundReason.Duplicate]: 'دفعة مكررة',
  [PaymentRefundReason.WrongDiscount]: 'تصحيح خصم',
  [PaymentRefundReason.Other]: 'سبب آخر',
};

export interface PaymentRefund {
  readonly id: string;
  /** Official number — null until posted; the type's own sequence (BDR-01). */
  readonly number: number | null;
  readonly status: PaymentRefundStatus;
  /** The refunded posted payment (identifier-only reference, fixed at creation). */
  readonly paymentId: string;
  /** Copied from the payment (a refund always belongs to its supplier). */
  readonly supplierId: string;
  readonly date: string;
  /** Cash refunded, ILS ≥ 0 (capped at the payment's cash minus prior refunds). */
  readonly amount: number;
  /** Payment-time discount cancelled, ILS ≥ 0 (capped at the payment's discount
      minus prior reversals). Together with `amount`, at least one is > 0. */
  readonly discountReversal: number;
  readonly reasonType: PaymentRefundReason;
  /** Optional free-text description of the reason ('' when omitted). */
  readonly reasonNote: string;
  /** How the money came back — free text, like the payment's method (BDR-05). */
  readonly method: string;
  /** Method reference (transfer/cheque no.); may be empty. */
  readonly reference: string;
  readonly notes: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly postedAt: string | null;
  /** Set by reversal cancellation; null while the document stands. */
  readonly cancelledAt: string | null;
  /** The owner's stated reason for the cancellation ('' while it stands). */
  readonly cancelReason: string;
}

export interface PaymentRefundDraftInput {
  readonly paymentId: string;
  readonly date: string;
  readonly amount: number;
  readonly discountReversal?: number;
  readonly reasonType: PaymentRefundReason;
  readonly reasonNote?: string;
  readonly method?: string;
  readonly reference?: string;
  readonly notes?: string;
}

/** The refund's total debit to the supplier balance (mirror of paymentTotalCredit). */
export function refundTotalDebit(
  refund: Pick<PaymentRefund, 'amount' | 'discountReversal'>,
): number {
  return roundAmount(sumAmounts([refund.amount, refund.discountReversal]));
}
