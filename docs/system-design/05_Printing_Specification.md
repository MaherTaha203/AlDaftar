# 05 — Printing Specification

> Design only. All printable outputs and the shared rules they obey.
> Print views are S-24, S-34, S-44, S-82, S-83 (`02_Screen_Flow.md`),
> rendered through the PrintLayout component (`04_Component_Library.md`).

## 1. General print rules

- **Paper:** A4 portrait for all documents and the supplier statement;
  reports may declare landscape when column count requires it
  (`07_Report_Catalog.md` marks these).
- **Margins:** 18mm top, 15mm sides, 20mm bottom (bottom holds the footer).
- **Direction:** RTL page flow; numbers, document numbers, and references
  rendered LTR-isolated per `03_UI_Specification.md` §6.3.
- **Color:** print styles are monochrome-safe: status conveyed by text, not
  color alone; table zebra striping in light gray only.
- **Header (every page):** company name + logo (from Settings), document
  title, and — pages ≥ 2 — «تابع / continued» with the document number.
- **Footer (every page):** page «x من y», print timestamp, and the fixed
  note «مستند داخلي / internal document» (AlDaftar does not issue invoices
  or receipts — approved scope; prints are internal records and vouchers).
- **Arabic typography:** the theme's Arabic font embedded for print; body
  ≥ 11pt, tables ≥ 10pt; line height ≥ 1.5 for Arabic script legibility;
  no letter-spacing on Arabic text (breaks shaping); amounts in tabular
  numerals; **Latin (Western) numerals** (BDR-17 / DL-027); dates as
  **DD/MM/YYYY** (BDR-18 / DL-028).
- **Page breaks:** a table row never splits; the totals block never
  separates from the last line rows; signature block never orphans alone.

## 2. Purchase print (S-24)

- Header block: document number, date, status (Posted only — drafts print
  with a diagonal «مسودة/DRAFT» watermark), supplier name and contact.
- Supplier-invoice block: their invoice number/date, or the explicit badge
  «بدون فاتورة مورد / received without supplier invoice» — this visibility
  is a core purpose of the system.
- Lines table: #, product, quantity, unit, unit price, line discount
  (BDR-03 — column omitted if not approved), line total.
- Totals block (end, inline-start aligned): subtotal, document discount
  (BDR-03), tax (omitted — no tax in v1, PD-08 / DL-022), grand total;
  **amount in words (Arabic), required on prints** (BDR-19 / DL-029).
- Attachments note: count of archived files for this document.
- Signature strip: «المستلم / receiver» — single signature (single user).

## 3. Purchase Return print (S-34)

Same skeleton as Purchase with: reference to the original purchase number
(when linked), returned quantities, and totals as amounts credited. Title
«مرتجع شراء».

## 4. Payment voucher print (S-44)

- Number, date, supplier, amount (prominent MoneyDisplay), method (BDR-05),
  reference, settlement discount if approved (BDR-03), notes.
- No allocation table: payments use the running-balance model (BDR-04
  approved, DL-016), so a voucher does not itemize per-purchase allocation.
- Amount in words per BDR-19. Signature strip: «المستلم» + «الدافع».

## 5. Supplier statement print (S-83 / R-02)

- Header: supplier name, period, opening balance (BDR-06).
- Table: date, document type + number, description, debit (purchases),
  credit (returns/payments/discounts), running balance.
- Closing balance emphasized; page subtotals carried («يتبع») on multi-page
  statements.

## 6. Report prints (S-82)

- Every report from `07_Report_Catalog.md` prints through PrintLayout with:
  report title, parameter summary line (period, supplier, …), generation
  timestamp, the results table with repeated headers per page, and group
  subtotals/grand totals exactly as on screen.
- Orientation and column keep-lists are declared per report in 07.

## 7. Print production rules

- Print views are dedicated routes (`…/print`) styled with print CSS; the
  browser print dialog is the print mechanism. **PDF and Excel export are
  approved output channels for every report** (BDR-10 / DL-026 / BDD-009);
  PDF reuses the print view (print-to-PDF), Excel is generated from the same
  calculated rows.
- What appears on screen in a print view is exactly what prints (WYSIWYG);
  no hidden-on-paper content.
- Draft documents always watermark; Posted never do.
