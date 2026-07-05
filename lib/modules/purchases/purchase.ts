import { computeLineTotal, sumAmounts } from '../shared/money';

/**
 * Purchases module — types, per the frozen Purchase Architecture
 * (docs/purchase 01–03). Purchase = Goods Receipt; Draft → Posted lifecycle;
 * posted content immutable; totals always calculated; amounts in ILS
 * (BDR-02); official number = plain per-type integer at posting (BDR-01);
 * internal UUID never shown. Entry-time discounts and tax are deliberately
 * absent (approved discount is at payment time; tax pending BDR-09).
 */
export const PurchaseStatus = {
  Draft: 'draft',
  Posted: 'posted',
} as const;

export type PurchaseStatus = (typeof PurchaseStatus)[keyof typeof PurchaseStatus];

export interface PurchaseLine {
  readonly id: string;
  readonly productId: string;
  readonly unitId: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly notes: string;
}

export interface Purchase {
  readonly id: string;
  /** Official number — null until posted (BDR-01). */
  readonly number: number | null;
  readonly status: PurchaseStatus;
  readonly supplierId: string;
  /** Receipt date, ISO yyyy-mm-dd. */
  readonly date: string;
  /** The supplier's paper-invoice reference; empty when none. */
  readonly supplierInvoiceRef: string;
  /** Explicit «بدون فاتورة مورد» flag (core monitoring purpose). */
  readonly withoutSupplierInvoice: boolean;
  readonly notes: string;
  readonly lines: readonly PurchaseLine[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly postedAt: string | null;
}

/** Draft save payload (S-22/S-23). Lines may be empty while drafting. */
export interface PurchaseDraftInput {
  readonly supplierId: string;
  readonly date: string;
  readonly supplierInvoiceRef?: string;
  readonly withoutSupplierInvoice?: boolean;
  readonly notes?: string;
  readonly lines: readonly PurchaseLineInput[];
}

export interface PurchaseLineInput {
  readonly productId: string;
  readonly unitId: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly notes?: string;
}

/** Line total = quantity × unit price, rounded (frozen architecture 03). */
export function purchaseLineTotal(line: Pick<PurchaseLine, 'quantity' | 'unitPrice'>): number {
  return computeLineTotal(line.quantity, line.unitPrice);
}

/** Document total = sum of line totals (calculated, never entered). */
export function purchaseTotal(lines: readonly PurchaseLine[]): number {
  return sumAmounts(lines.map(purchaseLineTotal));
}
