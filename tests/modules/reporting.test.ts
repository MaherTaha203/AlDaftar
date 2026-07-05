import { describe, expect, it } from 'vitest';
import type { Purchase } from '@/lib/modules/purchases';
import type { PurchaseReturn } from '@/lib/modules/purchase-returns';
import type { Payment } from '@/lib/modules/payments';
import type { Supplier } from '@/lib/modules/suppliers';
import type { Product } from '@/lib/modules/products';
import {
  buildSupplierStatement,
  computeSupplierBalances,
  inRange,
  paymentDiscounts,
  productMovement,
  purchasesByPeriod,
  type ReportingSnapshot,
} from '@/lib/modules/reporting';

/**
 * Reporting aggregations: asserts the approved calculated-figure rules
 * (01_System_Workflow.md §0.2) — balance = purchases − returns − payments
 * (− discounts); inventory = posted purchase qty − posted return qty; posted
 * documents only. Pure logic over fixtures; no pending decision is exercised.
 */
function supplier(id: string, name: string): Supplier {
  return {
    id,
    name,
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    phone: '',
    address: '',
    taxReference: '',
    notes: '',
  };
}

function product(id: string, name: string): Product {
  return {
    id,
    name,
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    code: '',
    categoryId: '',
    unitId: 'u1',
    notes: '',
  };
}

function purchase(
  over: Partial<Purchase> & Pick<Purchase, 'id' | 'supplierId' | 'date'>,
): Purchase {
  return {
    number: 1,
    status: 'posted',
    supplierInvoiceRef: 'INV-1',
    withoutSupplierInvoice: false,
    notes: '',
    lines: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    postedAt: `${over.date}T10:00:00.000Z`,
    ...over,
  };
}

function payment(over: Partial<Payment> & Pick<Payment, 'id' | 'supplierId' | 'date'>): Payment {
  return {
    number: 1,
    status: 'posted',
    amount: 0,
    discount: 0,
    method: 'cash',
    reference: '',
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    postedAt: `${over.date}T10:00:00.000Z`,
    ...over,
  };
}

function purchaseReturn(
  over: Partial<PurchaseReturn> & Pick<PurchaseReturn, 'id' | 'supplierId' | 'purchaseId' | 'date'>,
): PurchaseReturn {
  return {
    number: 1,
    status: 'posted',
    notes: '',
    lines: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    postedAt: `${over.date}T10:00:00.000Z`,
    ...over,
  };
}

function snapshot(over: Partial<ReportingSnapshot>): ReportingSnapshot {
  return {
    purchases: [],
    returns: [],
    payments: [],
    suppliers: [],
    products: [],
    categories: [],
    units: [],
    attachments: [],
    auditEntries: [],
    ...over,
  };
}

const scenario = snapshot({
  suppliers: [supplier('s1', 'مورد أول'), supplier('s2', 'مورد ثاني')],
  products: [product('a', 'منتج أ'), product('b', 'منتج ب')],
  purchases: [
    purchase({
      id: 'p1',
      supplierId: 's1',
      date: '2026-01-10',
      number: 1,
      lines: [
        { id: 'l1', productId: 'a', unitId: 'u1', quantity: 2, unitPrice: 50, notes: '' },
        { id: 'l2', productId: 'b', unitId: 'u1', quantity: 1, unitPrice: 30, notes: '' },
      ],
    }),
    // A draft must never affect any figure.
    purchase({
      id: 'p2',
      supplierId: 's1',
      date: '2026-01-12',
      status: 'draft',
      number: null,
      postedAt: null,
      lines: [{ id: 'l3', productId: 'a', unitId: 'u1', quantity: 9, unitPrice: 99, notes: '' }],
    }),
  ],
  payments: [
    payment({ id: 'pm1', supplierId: 's1', date: '2026-01-15', amount: 40, discount: 10 }),
  ],
  returns: [
    purchaseReturn({
      id: 'r1',
      supplierId: 's1',
      purchaseId: 'p1',
      date: '2026-01-20',
      lines: [
        {
          id: 'rl1',
          purchaseLineId: 'l1',
          productId: 'a',
          unitId: 'u1',
          quantity: 1,
          unitPrice: 50,
        },
      ],
    }),
  ],
});

describe('inRange', () => {
  it('is inclusive and treats missing bounds as open', () => {
    expect(inRange('2026-01-10', {})).toBe(true);
    expect(inRange('2026-01-10', { from: '2026-01-10', to: '2026-01-10' })).toBe(true);
    expect(inRange('2026-01-09', { from: '2026-01-10' })).toBe(false);
    expect(inRange('2026-01-11', { to: '2026-01-10' })).toBe(false);
  });
});

describe('buildSupplierStatement', () => {
  const statement = buildSupplierStatement('s1', scenario);

  it('orders rows by date and threads a running balance', () => {
    expect(statement.rows.map((r) => r.kind)).toEqual([
      'purchase',
      'payment',
      'discount',
      'return',
    ]);
    // purchase +130 → 130; payment −40 → 90; discount −10 → 80; return −50 → 30.
    expect(statement.rows.map((r) => r.balance)).toEqual([130, 90, 80, 30]);
  });

  it('computes totals and closing = debit − credit (opening 0 until BDR-06)', () => {
    expect(statement.opening).toBe(0);
    expect(statement.totalDebit).toBe(130);
    // credit = payment 40 + discount 10 + return (1 × 50) = 100.
    expect(statement.totalCredit).toBe(100);
    expect(statement.closing).toBe(30);
  });

  it('excludes draft documents', () => {
    // p2 (draft, 9 × 99) would swamp the totals if included.
    expect(statement.totalDebit).toBe(130);
  });
});

describe('computeSupplierBalances', () => {
  it('nets purchases against returns and payments per supplier', () => {
    const balances = computeSupplierBalances(scenario);
    const s1 = balances.find((b) => b.supplierId === 's1');
    const s2 = balances.find((b) => b.supplierId === 's2');
    expect(s1?.balance).toBe(30);
    expect(s1?.lastDate).toBe('2026-01-20');
    expect(s2?.balance).toBe(0);
  });
});

describe('purchasesByPeriod', () => {
  it('lists only posted purchases with the period total', () => {
    const result = purchasesByPeriod(scenario);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].id).toBe('p1');
    expect(result.total).toBe(130);
    expect(result.countWithInvoice).toBe(1);
  });
});

describe('productMovement', () => {
  it('nets posted purchase quantity in against posted return quantity out', () => {
    const rows = productMovement(scenario);
    const a = rows.find((r) => r.productId === 'a');
    const b = rows.find((r) => r.productId === 'b');
    expect(a).toMatchObject({ quantityIn: 2, quantityOut: 1, net: 1 });
    expect(b).toMatchObject({ quantityIn: 1, quantityOut: 0, net: 1 });
  });
});

describe('paymentDiscounts', () => {
  it('lists only payments carrying a settlement discount', () => {
    const result = paymentDiscounts(scenario);
    expect(result.rows).toHaveLength(1);
    expect(result.total).toBe(10);
  });
});
