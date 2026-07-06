/**
 * Reporting read-model — pure aggregations (business-architecture R1 "derived
 * read models": rebuildable, never hand-corrected, write nothing). Every
 * figure is calculated from POSTED documents only, per the approved rules
 * (01_System_Workflow.md §0.2): supplier balance = purchases − returns −
 * payments (− payment discounts); inventory = posted purchase qty − posted
 * return qty. Opening balances are 0 until BDR-06 is decided.
 *
 * These functions take plain document/master arrays and return plain data —
 * no I/O, fully unit-testable. The ReportingService loads the snapshot; the
 * report screens call these. No pending business decision is exercised here;
 * the approved BDR-10 catalog (07_Report_Catalog.md) maps 1:1 to the exports
 * below. Supplier Aging is intentionally absent (contents deferred, BDD-009).
 */
import type { Purchase } from '@/lib/modules/purchases';
import { purchaseTotal } from '@/lib/modules/purchases';
import type { PurchaseReturn } from '@/lib/modules/purchase-returns';
import { returnTotal } from '@/lib/modules/purchase-returns';
import type { Payment } from '@/lib/modules/payments';
import type { Supplier } from '@/lib/modules/suppliers';
import type { Product } from '@/lib/modules/products';
import type { Category } from '@/lib/modules/categories';
import type { Unit } from '@/lib/modules/units';
import type { Attachment } from '@/lib/modules/attachments';
import type { AuditEntry } from '@/lib/modules/audit';
import { sumAmounts } from '@/lib/modules/shared/money';

const POSTED = 'posted';

export interface ReportingSnapshot {
  readonly purchases: readonly Purchase[];
  readonly returns: readonly PurchaseReturn[];
  readonly payments: readonly Payment[];
  readonly suppliers: readonly Supplier[];
  readonly products: readonly Product[];
  readonly categories: readonly Category[];
  readonly units: readonly Unit[];
  readonly attachments: readonly Attachment[];
  readonly auditEntries: readonly AuditEntry[];
}

/** Inclusive date range on ISO `yyyy-mm-dd` strings; either bound optional. */
export interface DateRange {
  readonly from?: string | null;
  readonly to?: string | null;
}

export function inRange(date: string, range: DateRange): boolean {
  if (range.from && date < range.from) {
    return false;
  }
  if (range.to && date > range.to) {
    return false;
  }
  return true;
}

function nameMap(records: readonly { id: string; name: string }[]): Map<string, string> {
  return new Map(records.map((record) => [record.id, record.name]));
}

function isPosted(doc: { status: string }): boolean {
  return doc.status === POSTED;
}

/** Stable order for ledger entries: date, then posting time, then number. */
function byDateThenPosting(
  a: { date: string; postedAt: string | null; number: number | null },
  b: { date: string; postedAt: string | null; number: number | null },
): number {
  return (
    a.date.localeCompare(b.date) ||
    (a.postedAt ?? '').localeCompare(b.postedAt ?? '') ||
    (a.number ?? 0) - (b.number ?? 0)
  );
}

// ── Suppliers ──────────────────────────────────────────────────────────────

export type LedgerKind = 'purchase' | 'return' | 'payment' | 'discount';

export interface StatementRow {
  readonly kind: LedgerKind;
  readonly date: string;
  readonly number: number | null;
  readonly documentId: string;
  /** Increases payable (purchases). */
  readonly debit: number;
  /** Decreases payable (returns, payments, settlement discounts). */
  readonly credit: number;
  readonly balance: number;
}

export interface SupplierStatement {
  readonly supplierId: string;
  readonly opening: number;
  readonly rows: readonly StatementRow[];
  readonly totalDebit: number;
  readonly totalCredit: number;
  readonly closing: number;
}

/**
 * Carried-forward balance from the supplier's posted documents strictly
 * before `from` (07_supplier_statement_effect.md §3.2/§3.4: the statement
 * must agree with the balance shown everywhere else for any period). The
 * pre-system opening remains the separate BDR-06 seed.
 */
function carriedForward(
  supplierId: string,
  snap: Pick<ReportingSnapshot, 'purchases' | 'returns' | 'payments'>,
  from: string,
): number {
  const amounts: number[] = [];
  for (const p of snap.purchases) {
    if (isPosted(p) && p.supplierId === supplierId && p.date < from) {
      amounts.push(purchaseTotal(p.lines));
    }
  }
  for (const r of snap.returns) {
    if (isPosted(r) && r.supplierId === supplierId && r.date < from) {
      amounts.push(-returnTotal(r.lines));
    }
  }
  for (const pay of snap.payments) {
    if (isPosted(pay) && pay.supplierId === supplierId && pay.date < from) {
      amounts.push(-pay.amount, -pay.discount);
    }
  }
  return sumAmounts(amounts);
}

/** R-S1 Supplier Statement. `opening` is the pre-system seed (0 until BDR-06). */
export function buildSupplierStatement(
  supplierId: string,
  snap: Pick<ReportingSnapshot, 'purchases' | 'returns' | 'payments'>,
  range: DateRange = {},
  opening = 0,
): SupplierStatement {
  if (range.from) {
    opening = sumAmounts([opening, carriedForward(supplierId, snap, range.from)]);
  }
  interface Raw {
    kind: LedgerKind;
    date: string;
    postedAt: string | null;
    number: number | null;
    documentId: string;
    debit: number;
    credit: number;
  }
  const raws: Raw[] = [];

  for (const p of snap.purchases) {
    if (isPosted(p) && p.supplierId === supplierId && inRange(p.date, range)) {
      raws.push({
        kind: 'purchase',
        date: p.date,
        postedAt: p.postedAt,
        number: p.number,
        documentId: p.id,
        debit: purchaseTotal(p.lines),
        credit: 0,
      });
    }
  }
  for (const r of snap.returns) {
    if (isPosted(r) && r.supplierId === supplierId && inRange(r.date, range)) {
      raws.push({
        kind: 'return',
        date: r.date,
        postedAt: r.postedAt,
        number: r.number,
        documentId: r.id,
        debit: 0,
        credit: returnTotal(r.lines),
      });
    }
  }
  for (const pay of snap.payments) {
    if (isPosted(pay) && pay.supplierId === supplierId && inRange(pay.date, range)) {
      raws.push({
        kind: 'payment',
        date: pay.date,
        postedAt: pay.postedAt,
        number: pay.number,
        documentId: pay.id,
        debit: 0,
        credit: pay.amount,
      });
      if (pay.discount > 0) {
        raws.push({
          kind: 'discount',
          date: pay.date,
          postedAt: pay.postedAt,
          number: pay.number,
          documentId: pay.id,
          debit: 0,
          credit: pay.discount,
        });
      }
    }
  }

  raws.sort(byDateThenPosting);

  let balance = opening;
  const rows: StatementRow[] = raws.map((raw) => {
    balance = sumAmounts([balance, raw.debit, -raw.credit]);
    return {
      kind: raw.kind,
      date: raw.date,
      number: raw.number,
      documentId: raw.documentId,
      debit: raw.debit,
      credit: raw.credit,
      balance,
    };
  });

  const totalDebit = sumAmounts(rows.map((row) => row.debit));
  const totalCredit = sumAmounts(rows.map((row) => row.credit));
  return {
    supplierId,
    opening,
    rows,
    totalDebit,
    totalCredit,
    closing: sumAmounts([opening, totalDebit, -totalCredit]),
  };
}

export interface SupplierBalance {
  readonly supplierId: string;
  readonly name: string;
  readonly lastDate: string | null;
  readonly balance: number;
}

/** R-S2 Supplier Balances, as-of a date (inclusive; default: all history). */
export function computeSupplierBalances(
  snap: Pick<ReportingSnapshot, 'purchases' | 'returns' | 'payments' | 'suppliers'>,
  asOf?: string | null,
): SupplierBalance[] {
  const range: DateRange = { to: asOf ?? null };
  const names = nameMap(snap.suppliers);
  const debit = new Map<string, number>();
  const credit = new Map<string, number>();
  const lastDate = new Map<string, string>();

  const touch = (supplierId: string, date: string): void => {
    const current = lastDate.get(supplierId);
    if (!current || date > current) {
      lastDate.set(supplierId, date);
    }
  };
  const add = (bucket: Map<string, number>, id: string, amount: number): void => {
    bucket.set(id, (bucket.get(id) ?? 0) + amount);
  };

  for (const p of snap.purchases) {
    if (isPosted(p) && inRange(p.date, range)) {
      add(debit, p.supplierId, purchaseTotal(p.lines));
      touch(p.supplierId, p.date);
    }
  }
  for (const r of snap.returns) {
    if (isPosted(r) && inRange(r.date, range)) {
      add(credit, r.supplierId, returnTotal(r.lines));
      touch(r.supplierId, r.date);
    }
  }
  for (const pay of snap.payments) {
    if (isPosted(pay) && inRange(pay.date, range)) {
      add(credit, pay.supplierId, sumAmounts([pay.amount, pay.discount]));
      touch(pay.supplierId, pay.date);
    }
  }

  const ids = new Set<string>([...debit.keys(), ...credit.keys(), ...names.keys()]);
  const balances: SupplierBalance[] = [];
  for (const id of ids) {
    balances.push({
      supplierId: id,
      name: names.get(id) ?? id,
      lastDate: lastDate.get(id) ?? null,
      balance: sumAmounts([debit.get(id) ?? 0, -(credit.get(id) ?? 0)]),
    });
  }
  return balances.sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name, 'ar'));
}

// ── Purchases ────────────────────────────────────────────────────────────────

export interface PurchaseRow {
  readonly id: string;
  readonly number: number | null;
  readonly date: string;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly supplierInvoiceRef: string;
  readonly withoutSupplierInvoice: boolean;
  readonly total: number;
}

export interface PurchasesByPeriod {
  readonly rows: readonly PurchaseRow[];
  readonly total: number;
  readonly countWithInvoice: number;
  readonly countWithoutInvoice: number;
}

/** R-P1 Purchases by Period. */
export function purchasesByPeriod(
  snap: Pick<ReportingSnapshot, 'purchases' | 'suppliers'>,
  range: DateRange = {},
  options: { supplierId?: string | null; withoutInvoiceOnly?: boolean } = {},
): PurchasesByPeriod {
  const names = nameMap(snap.suppliers);
  const rows: PurchaseRow[] = [];
  for (const p of snap.purchases) {
    if (!isPosted(p) || !inRange(p.date, range)) {
      continue;
    }
    if (options.supplierId && p.supplierId !== options.supplierId) {
      continue;
    }
    if (options.withoutInvoiceOnly && !p.withoutSupplierInvoice) {
      continue;
    }
    rows.push({
      id: p.id,
      number: p.number,
      date: p.date,
      supplierId: p.supplierId,
      supplierName: names.get(p.supplierId) ?? p.supplierId,
      supplierInvoiceRef: p.supplierInvoiceRef,
      withoutSupplierInvoice: p.withoutSupplierInvoice,
      total: purchaseTotal(p.lines),
    });
  }
  rows.sort((a, b) => byDateThenPosting({ ...a, postedAt: null }, { ...b, postedAt: null }));
  return {
    rows,
    total: sumAmounts(rows.map((row) => row.total)),
    countWithInvoice: rows.filter((row) => !row.withoutSupplierInvoice).length,
    countWithoutInvoice: rows.filter((row) => row.withoutSupplierInvoice).length,
  };
}

export interface GroupTotal {
  readonly key: string;
  readonly label: string;
  readonly count: number;
  readonly quantity: number;
  readonly amount: number;
}

/** R-P2 Purchases by Supplier. */
export function purchasesBySupplier(
  snap: Pick<ReportingSnapshot, 'purchases' | 'suppliers'>,
  range: DateRange = {},
): GroupTotal[] {
  const names = nameMap(snap.suppliers);
  const amount = new Map<string, number>();
  const count = new Map<string, number>();
  for (const p of snap.purchases) {
    if (!isPosted(p) || !inRange(p.date, range)) {
      continue;
    }
    amount.set(p.supplierId, (amount.get(p.supplierId) ?? 0) + purchaseTotal(p.lines));
    count.set(p.supplierId, (count.get(p.supplierId) ?? 0) + 1);
  }
  return [...amount.keys()]
    .map((id) => ({
      key: id,
      label: names.get(id) ?? id,
      count: count.get(id) ?? 0,
      quantity: 0,
      amount: sumAmounts([amount.get(id) ?? 0]),
    }))
    .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label, 'ar'));
}

export interface ProductLineTotal {
  readonly productId: string;
  readonly productName: string;
  readonly unitName: string;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly quantity: number;
  readonly amount: number;
  readonly averagePrice: number;
}

/** R-P3 Purchases by Product (with category context). */
export function purchasesByProduct(
  snap: Pick<ReportingSnapshot, 'purchases' | 'products' | 'units' | 'categories'>,
  range: DateRange = {},
): ProductLineTotal[] {
  const products = new Map(snap.products.map((p) => [p.id, p]));
  const unitNames = nameMap(snap.units);
  const categoryNames = nameMap(snap.categories);
  const quantity = new Map<string, number>();
  const amount = new Map<string, number>();

  for (const purchase of snap.purchases) {
    if (!isPosted(purchase) || !inRange(purchase.date, range)) {
      continue;
    }
    for (const line of purchase.lines) {
      quantity.set(line.productId, (quantity.get(line.productId) ?? 0) + line.quantity);
      amount.set(
        line.productId,
        (amount.get(line.productId) ?? 0) + line.quantity * line.unitPrice,
      );
    }
  }

  return [...quantity.keys()]
    .map((productId) => {
      const product = products.get(productId);
      const qty = quantity.get(productId) ?? 0;
      const amt = sumAmounts([amount.get(productId) ?? 0]);
      const categoryId = product?.categoryId ?? '';
      return {
        productId,
        productName: product?.name ?? productId,
        unitName: product ? (unitNames.get(product.unitId) ?? '') : '',
        categoryId,
        categoryName: categoryId ? (categoryNames.get(categoryId) ?? '') : '',
        quantity: qty,
        amount: amt,
        averagePrice: qty > 0 ? sumAmounts([amt / qty]) : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount || a.productName.localeCompare(b.productName, 'ar'));
}

/** R-P4 Purchases by Category. */
export function purchasesByCategory(
  snap: Pick<ReportingSnapshot, 'purchases' | 'products' | 'categories'>,
  range: DateRange = {},
): GroupTotal[] {
  const products = new Map(snap.products.map((p) => [p.id, p]));
  const categoryNames = nameMap(snap.categories);
  const amount = new Map<string, number>();
  const quantity = new Map<string, number>();
  const UNCATEGORIZED = '';

  for (const purchase of snap.purchases) {
    if (!isPosted(purchase) || !inRange(purchase.date, range)) {
      continue;
    }
    for (const line of purchase.lines) {
      const categoryId = products.get(line.productId)?.categoryId ?? UNCATEGORIZED;
      amount.set(categoryId, (amount.get(categoryId) ?? 0) + line.quantity * line.unitPrice);
      quantity.set(categoryId, (quantity.get(categoryId) ?? 0) + line.quantity);
    }
  }

  return [...amount.keys()]
    .map((categoryId) => ({
      key: categoryId,
      label: categoryId ? (categoryNames.get(categoryId) ?? categoryId) : 'غير مصنّف',
      count: 0,
      quantity: quantity.get(categoryId) ?? 0,
      amount: sumAmounts([amount.get(categoryId) ?? 0]),
    }))
    .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label, 'ar'));
}

// ── Payments ─────────────────────────────────────────────────────────────────

export interface PaymentRow {
  readonly id: string;
  readonly number: number | null;
  readonly date: string;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly method: string;
  readonly reference: string;
  readonly amount: number;
  readonly discount: number;
}

export interface PaymentsReport {
  readonly rows: readonly PaymentRow[];
  readonly totalAmount: number;
  readonly totalDiscount: number;
}

/** R-M1 Payments Report. */
export function paymentsReport(
  snap: Pick<ReportingSnapshot, 'payments' | 'suppliers'>,
  range: DateRange = {},
  options: { supplierId?: string | null; method?: string | null } = {},
): PaymentsReport {
  const names = nameMap(snap.suppliers);
  const rows: PaymentRow[] = [];
  for (const pay of snap.payments) {
    if (!isPosted(pay) || !inRange(pay.date, range)) {
      continue;
    }
    if (options.supplierId && pay.supplierId !== options.supplierId) {
      continue;
    }
    if (options.method && pay.method !== options.method) {
      continue;
    }
    rows.push({
      id: pay.id,
      number: pay.number,
      date: pay.date,
      supplierId: pay.supplierId,
      supplierName: names.get(pay.supplierId) ?? pay.supplierId,
      method: pay.method,
      reference: pay.reference,
      amount: pay.amount,
      discount: pay.discount,
    });
  }
  rows.sort((a, b) => byDateThenPosting({ ...a, postedAt: null }, { ...b, postedAt: null }));
  return {
    rows,
    totalAmount: sumAmounts(rows.map((row) => row.amount)),
    totalDiscount: sumAmounts(rows.map((row) => row.discount)),
  };
}

/** R-M2 Payments by Supplier. */
export function paymentsBySupplier(
  snap: Pick<ReportingSnapshot, 'payments' | 'suppliers'>,
  range: DateRange = {},
): GroupTotal[] {
  const names = nameMap(snap.suppliers);
  const amount = new Map<string, number>();
  const count = new Map<string, number>();
  for (const pay of snap.payments) {
    if (!isPosted(pay) || !inRange(pay.date, range)) {
      continue;
    }
    amount.set(pay.supplierId, (amount.get(pay.supplierId) ?? 0) + pay.amount);
    count.set(pay.supplierId, (count.get(pay.supplierId) ?? 0) + 1);
  }
  return [...amount.keys()]
    .map((id) => ({
      key: id,
      label: names.get(id) ?? id,
      count: count.get(id) ?? 0,
      quantity: 0,
      amount: sumAmounts([amount.get(id) ?? 0]),
    }))
    .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label, 'ar'));
}

export interface DiscountRow {
  readonly id: string;
  readonly number: number | null;
  readonly date: string;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly discount: number;
}

/** R-M3 Payment Discounts (settlement discounts exist only at payment time). */
export function paymentDiscounts(
  snap: Pick<ReportingSnapshot, 'payments' | 'suppliers'>,
  range: DateRange = {},
  options: { supplierId?: string | null } = {},
): { rows: readonly DiscountRow[]; total: number } {
  const names = nameMap(snap.suppliers);
  const rows: DiscountRow[] = [];
  for (const pay of snap.payments) {
    if (!isPosted(pay) || pay.discount <= 0 || !inRange(pay.date, range)) {
      continue;
    }
    if (options.supplierId && pay.supplierId !== options.supplierId) {
      continue;
    }
    rows.push({
      id: pay.id,
      number: pay.number,
      date: pay.date,
      supplierId: pay.supplierId,
      supplierName: names.get(pay.supplierId) ?? pay.supplierId,
      discount: pay.discount,
    });
  }
  rows.sort((a, b) => byDateThenPosting({ ...a, postedAt: null }, { ...b, postedAt: null }));
  return { rows, total: sumAmounts(rows.map((row) => row.discount)) };
}

// ── Purchase returns ──────────────────────────────────────────────────────────

export interface ReturnRow {
  readonly id: string;
  readonly number: number | null;
  readonly date: string;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly purchaseId: string;
  readonly purchaseNumber: number | null;
  readonly total: number;
}

/** R-R1 Purchase Returns Report. */
export function returnsReport(
  snap: Pick<ReportingSnapshot, 'returns' | 'purchases' | 'suppliers'>,
  range: DateRange = {},
  options: { supplierId?: string | null } = {},
): { rows: readonly ReturnRow[]; total: number } {
  const names = nameMap(snap.suppliers);
  const purchaseNumbers = new Map(snap.purchases.map((p) => [p.id, p.number]));
  const rows: ReturnRow[] = [];
  for (const r of snap.returns) {
    if (!isPosted(r) || !inRange(r.date, range)) {
      continue;
    }
    if (options.supplierId && r.supplierId !== options.supplierId) {
      continue;
    }
    rows.push({
      id: r.id,
      number: r.number,
      date: r.date,
      supplierId: r.supplierId,
      supplierName: names.get(r.supplierId) ?? r.supplierId,
      purchaseId: r.purchaseId,
      purchaseNumber: purchaseNumbers.get(r.purchaseId) ?? null,
      total: returnTotal(r.lines),
    });
  }
  rows.sort((a, b) => byDateThenPosting({ ...a, postedAt: null }, { ...b, postedAt: null }));
  return { rows, total: sumAmounts(rows.map((row) => row.total)) };
}

// ── Products ──────────────────────────────────────────────────────────────────

export interface ProductMovementRow {
  readonly productId: string;
  readonly productName: string;
  readonly code: string;
  readonly unitName: string;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly quantityIn: number;
  readonly quantityOut: number;
  readonly net: number;
}

/** R-D1 Product Movement (in = posted purchases, out = posted returns). */
export function productMovement(
  snap: Pick<ReportingSnapshot, 'purchases' | 'returns' | 'products' | 'units' | 'categories'>,
  range: DateRange = {},
): ProductMovementRow[] {
  const unitNames = nameMap(snap.units);
  const categoryNames = nameMap(snap.categories);
  const quantityIn = new Map<string, number>();
  const quantityOut = new Map<string, number>();

  for (const purchase of snap.purchases) {
    if (isPosted(purchase) && inRange(purchase.date, range)) {
      for (const line of purchase.lines) {
        quantityIn.set(line.productId, (quantityIn.get(line.productId) ?? 0) + line.quantity);
      }
    }
  }
  for (const r of snap.returns) {
    if (isPosted(r) && inRange(r.date, range)) {
      for (const line of r.lines) {
        quantityOut.set(line.productId, (quantityOut.get(line.productId) ?? 0) + line.quantity);
      }
    }
  }

  return snap.products
    .map((product) => {
      const qtyIn = quantityIn.get(product.id) ?? 0;
      const qtyOut = quantityOut.get(product.id) ?? 0;
      return {
        productId: product.id,
        productName: product.name,
        code: product.code,
        unitName: unitNames.get(product.unitId) ?? '',
        categoryId: product.categoryId,
        categoryName: product.categoryId ? (categoryNames.get(product.categoryId) ?? '') : '',
        quantityIn: qtyIn,
        quantityOut: qtyOut,
        net: qtyIn - qtyOut,
      };
    })
    .sort((a, b) => a.productName.localeCompare(b.productName, 'ar'));
}

export interface LastPriceRow {
  readonly productId: string;
  readonly productName: string;
  readonly code: string;
  readonly unitName: string;
  readonly lastPrice: number | null;
  readonly lastDate: string | null;
  readonly supplierId: string | null;
  readonly supplierName: string | null;
}

/** R-D2 Last Purchase Price (from the most recent posted purchase per product). */
export function lastPurchasePrice(
  snap: Pick<ReportingSnapshot, 'purchases' | 'products' | 'units' | 'suppliers'>,
): LastPriceRow[] {
  const unitNames = nameMap(snap.units);
  const supplierNames = nameMap(snap.suppliers);
  interface Best {
    date: string;
    postedAt: string | null;
    price: number;
    supplierId: string;
  }
  const best = new Map<string, Best>();

  const posted = snap.purchases.filter(isPosted);
  for (const purchase of posted) {
    for (const line of purchase.lines) {
      const current = best.get(line.productId);
      const candidate: Best = {
        date: purchase.date,
        postedAt: purchase.postedAt,
        price: line.unitPrice,
        supplierId: purchase.supplierId,
      };
      if (
        !current ||
        byDateThenPosting(
          { date: current.date, postedAt: current.postedAt, number: null },
          { date: candidate.date, postedAt: candidate.postedAt, number: null },
        ) < 0
      ) {
        best.set(line.productId, candidate);
      }
    }
  }

  return snap.products
    .map((product) => {
      const entry = best.get(product.id);
      return {
        productId: product.id,
        productName: product.name,
        code: product.code,
        unitName: unitNames.get(product.unitId) ?? '',
        lastPrice: entry ? entry.price : null,
        lastDate: entry ? entry.date : null,
        supplierId: entry ? entry.supplierId : null,
        supplierName: entry ? (supplierNames.get(entry.supplierId) ?? entry.supplierId) : null,
      };
    })
    .sort((a, b) => a.productName.localeCompare(b.productName, 'ar'));
}

/** R-D3 Inactive Products: no posted purchase line within the range. */
export function inactiveProducts(
  snap: Pick<ReportingSnapshot, 'purchases' | 'products'>,
  range: DateRange = {},
): { productId: string; productName: string; code: string; lastMovement: string | null }[] {
  const lastMovement = new Map<string, string>();
  const movedInRange = new Set<string>();

  for (const purchase of snap.purchases) {
    if (!isPosted(purchase)) {
      continue;
    }
    for (const line of purchase.lines) {
      const current = lastMovement.get(line.productId);
      if (!current || purchase.date > current) {
        lastMovement.set(line.productId, purchase.date);
      }
      if (inRange(purchase.date, range)) {
        movedInRange.add(line.productId);
      }
    }
  }

  return snap.products
    .filter((product) => !movedInRange.has(product.id))
    .map((product) => ({
      productId: product.id,
      productName: product.name,
      code: product.code,
      lastMovement: lastMovement.get(product.id) ?? null,
    }))
    .sort(
      (a, b) =>
        (a.lastMovement ?? '').localeCompare(b.lastMovement ?? '') ||
        a.productName.localeCompare(b.productName, 'ar'),
    );
}

// ── Attachments ───────────────────────────────────────────────────────────────

export interface OwnerRef {
  readonly type: string;
  readonly id: string;
  readonly number: number | null;
  readonly date: string;
  readonly supplierName: string;
}

/** All posted documents that can own attachments, as owner references. */
function postedOwners(
  snap: Pick<ReportingSnapshot, 'purchases' | 'returns' | 'payments' | 'suppliers'>,
  range: DateRange,
): OwnerRef[] {
  const names = nameMap(snap.suppliers);
  const owners: OwnerRef[] = [];
  for (const p of snap.purchases) {
    if (isPosted(p) && inRange(p.date, range)) {
      owners.push({
        type: 'purchase',
        id: p.id,
        number: p.number,
        date: p.date,
        supplierName: names.get(p.supplierId) ?? p.supplierId,
      });
    }
  }
  for (const r of snap.returns) {
    if (isPosted(r) && inRange(r.date, range)) {
      owners.push({
        type: 'purchase-return',
        id: r.id,
        number: r.number,
        date: r.date,
        supplierName: names.get(r.supplierId) ?? r.supplierId,
      });
    }
  }
  for (const pay of snap.payments) {
    if (isPosted(pay) && inRange(pay.date, range)) {
      owners.push({
        type: 'payment',
        id: pay.id,
        number: pay.number,
        date: pay.date,
        supplierName: names.get(pay.supplierId) ?? pay.supplierId,
      });
    }
  }
  return owners;
}

/** R-A1 Missing Attachments: posted documents with zero attachments. */
export function missingAttachments(
  snap: Pick<ReportingSnapshot, 'purchases' | 'returns' | 'payments' | 'suppliers' | 'attachments'>,
  range: DateRange = {},
  options: { ownerType?: string | null } = {},
): OwnerRef[] {
  const withAttachment = new Set(snap.attachments.map((a) => `${a.ownerType}:${a.ownerId}`));
  return postedOwners(snap, range)
    .filter((owner) => !options.ownerType || owner.type === options.ownerType)
    .filter((owner) => !withAttachment.has(`${owner.type}:${owner.id}`))
    .sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));
}

export interface AttachmentRow {
  readonly id: string;
  readonly title: string;
  readonly ownerType: string;
  readonly contentType: string;
  readonly size: number;
  readonly createdAt: string;
}

/** R-A2 Attachments Report. Range applies to the attachment upload date. */
export function attachmentsReport(
  snap: Pick<ReportingSnapshot, 'attachments'>,
  range: DateRange = {},
  options: { ownerType?: string | null } = {},
): { rows: readonly AttachmentRow[]; countByOwnerType: Record<string, number> } {
  const rows: AttachmentRow[] = [];
  const countByOwnerType: Record<string, number> = {};
  for (const attachment of snap.attachments) {
    const uploadDate = attachment.createdAt.slice(0, 10);
    if (!inRange(uploadDate, range)) {
      continue;
    }
    if (options.ownerType && attachment.ownerType !== options.ownerType) {
      continue;
    }
    rows.push({
      id: attachment.id,
      title: attachment.title,
      ownerType: attachment.ownerType,
      contentType: attachment.contentType,
      size: attachment.size,
      createdAt: attachment.createdAt,
    });
    countByOwnerType[attachment.ownerType] = (countByOwnerType[attachment.ownerType] ?? 0) + 1;
  }
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { rows, countByOwnerType };
}

// ── System ────────────────────────────────────────────────────────────────

export interface AuditLogRow {
  readonly id: string;
  readonly timestamp: string;
  readonly user: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityLabel: string;
  readonly summary: string;
}

/** R-Y1 Audit Log Report (also served interactively at /audit-log). */
export function auditLogReport(
  snap: Pick<ReportingSnapshot, 'auditEntries'>,
  range: DateRange = {},
  options: { action?: string | null; module?: string | null } = {},
): readonly AuditLogRow[] {
  return snap.auditEntries
    .filter((entry) => inRange(entry.timestamp.slice(0, 10), range))
    .filter((entry) => !options.action || entry.action === options.action)
    .filter((entry) => !options.module || entry.entityType === options.module)
    .map((entry) => ({
      id: entry.id,
      timestamp: entry.timestamp,
      user: entry.user,
      action: entry.action,
      entityType: entry.entityType,
      entityLabel: entry.entityLabel,
      summary: entry.summary,
    }))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
