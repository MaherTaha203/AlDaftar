# 07 — Report Catalog

> **Approved catalog (BDR-10 / PD-15, owner 2026-07-04; BDD-009, DL-026).**
> This is the fixed v1 list of reports. A report not in this catalog does not
> exist; adding one amends BDD-009 and this document first. All reports are
> calculated live from posted documents (approved decision), are read-only,
> and print via `05_Printing_Specification.md` §6.
>
> **Output channels (every report):** Screen View · Print · PDF · Excel.
> Common parameters where applicable: date range, supplier, product, category.

## Suppliers

### R-S1 — Supplier Statement (كشف حساب مورد)

- **Inputs:** supplier (required); date range (default: all history).
- **Outputs:** opening balance (BDR-06 — until decided, treated as 0), then
  one row per posted document (purchase / return / payment) with date,
  number, type, debit, credit, running balance; closing balance.
- **Order:** date ascending, tie-break posting order.
- **Print:** A4 portrait.

### R-S2 — Supplier Balances (أرصدة الموردين)

- **Inputs:** as-of date (default today); include-zero-balances toggle.
- **Outputs:** supplier, last document date, calculated balance; grand total
  payable.
- **Sort:** balance descending (default) or name.
- **Print:** portrait.

### R-S3 — Supplier Aging (أعمار الديون) — _contents deferred_

- **Status:** approved as a catalog entry, but its **aging buckets and aging
  method are Decision Pending** (BDD-009): the running-balance model (DL-016)
  does not imply an aging breakdown. Not built until the owner states the
  bucket boundaries and how the balance is aged. Listed here so the catalog is
  complete; the screen is intentionally absent until the detail is decided.

## Purchases

### R-P1 — Purchases by Period (المشتريات حسب الفترة)

- **Inputs:** date range; optional supplier; "without supplier invoice only"
  toggle.
- **Outputs:** purchase rows (number, date, supplier, invoice-ref / badge,
  total); period total; counts with/without supplier invoice.
- **Print:** portrait.

### R-P2 — Purchases by Supplier (المشتريات حسب المورد)

- **Inputs:** date range; optional supplier.
- **Outputs:** grouped by supplier — per-supplier subtotal (count, amount);
  grand total.
- **Sort:** amount descending.
- **Print:** portrait.

### R-P3 — Purchases by Product (المشتريات حسب المنتج)

- **Inputs:** date range; optional category / product.
- **Outputs:** product, unit, total quantity, total amount, average unit
  price (calculated); category subtotals.
- **Group:** category → product. **Sort:** amount descending.
- **Print:** landscape.

### R-P4 — Purchases by Category (المشتريات حسب التصنيف)

- **Inputs:** date range; optional category.
- **Outputs:** category, total quantity, total amount; grand total.
- **Sort:** amount descending.
- **Print:** portrait.

## Payments

### R-M1 — Payments Report (المدفوعات)

- **Inputs:** date range; optional supplier; optional method (free text,
  BDR-05).
- **Outputs:** payment rows (number, date, supplier, method, amount,
  settlement discount shown separately); period total; discount total.
- **Print:** portrait.

### R-M2 — Payments by Supplier (المدفوعات حسب المورد)

- **Inputs:** date range; optional supplier.
- **Outputs:** grouped by supplier — subtotal (count, amount, discount);
  grand total.
- **Sort:** amount descending.
- **Print:** portrait.

### R-M3 — Payment Discounts (خصومات الدفع)

- **Inputs:** date range; optional supplier.
- **Outputs:** rows of payment-time settlement discounts (payment number,
  date, supplier, discount amount); supplier subtotals; grand total.
  (Discounts exist only at payment time — DL-016 / DL-017.)
- **Print:** portrait.

## Purchase Returns

### R-R1 — Purchase Returns Report (مرتجعات الشراء)

- **Inputs:** date range; optional supplier.
- **Outputs:** return rows (number, date, supplier, original-purchase link,
  total); period total.
- **Print:** portrait.

## Products

### R-D1 — Product Movement (حركة المنتج)

- **Inputs:** date range; optional category / product.
- **Outputs:** product, unit, quantity in (posted purchases), quantity out
  (posted returns), net movement.
- **Group:** category. **Sort:** name.
- **Print:** portrait.

### R-D2 — Last Purchase Price (آخر سعر شراء)

- **Inputs:** optional category / product.
- **Outputs:** product, unit, last purchase unit price, last purchase date,
  supplier of last purchase.
- **Sort:** name.
- **Print:** portrait.

### R-D3 — Inactive Products (المنتجات غير المتحركة)

- **Inputs:** date range (the window of inactivity).
- **Outputs:** products with **no** posted purchase line within the range
  (plus archived products), showing name, code, last movement date (if any).
- **Sort:** last movement date ascending (never-moved first).
- **Print:** portrait.

## Attachments

### R-A1 — Missing Attachments (مستندات بلا مرفقات)

- **Inputs:** date range; optional owner type.
- **Outputs:** posted documents with zero attachments — owner type, number,
  date, supplier.
- **Print:** portrait.

### R-A2 — Attachments Report (تقرير المرفقات)

- **Inputs:** date range; optional owner type.
- **Outputs:** attachment title, owner (type + number / name), file type,
  size, upload date; counts by owner type.
- **Print:** landscape.

## System

### R-Y1 — Audit Log Report (تقرير سجل التدقيق)

- **Availability:** after the Audit phase (BDD-010).
- **Inputs:** date range; optional module; optional action.
- **Outputs:** timestamp, user, device, action, document, summary (before /
  after available in detail).
- **Print:** landscape.

## Catalog rules

1. A report not in this catalog does not exist; adding one amends BDD-009 and
   this document first.
2. Every report states its parameters on the print (05 §6).
3. Reports never write, cache decisions, or diverge from posted documents —
   re-running with the same inputs on the same data yields the same output.
4. Every report supports Screen View, Print, PDF, and Excel (BDD-009). The
   dashboard summary (`01 §8`, R-01) is the app's home surface, not a catalog
   report, and is navigational only.
