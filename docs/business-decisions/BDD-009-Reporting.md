# BDD-009 — Reporting

> **Status: Approved (owner, 2026-07-04).** Approved under the neutrality rules
> of `docs/business-architecture.md`; recorded in §5 (PD-15) and `decision-log`
> DL-026. Search (PD-16) is covered separately (DL-025, `06_Search_Specification.md`).

## Purpose

This document is the authoritative list of reports AlDaftar produces in v1.
All reports are **read-only** and calculated live from posted documents
(approved decision); no report stores its own facts (R1).

## Scope

- Covers: the fixed v1 report catalog, the output channels every report
  supports, and the deferred detail on Supplier Aging.
- Does not cover: search (PD-16, DL-025), the underlying documents (BDD-003),
  on-screen entry forms (UI specification).

## Approved Facts

- F4: the system exists to manage and archive supplier finances; the owner
  must be able to see the state of those finances.
- **The v1 report catalog is fixed to the list below (PD-15).** A report not
  in this catalog does not exist; adding one amends this document first.
- **Output channels:** every report supports **Screen View, Print, PDF, and
  Excel**. Print follows `05_Printing_Specification.md`.

## Approved report catalog

Grouped as the owner specified. Full contents/columns live in
`docs/system-design/07_Report_Catalog.md` (rewritten to this list).

| Group            | Reports                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------ |
| Suppliers        | Supplier Statement · Supplier Balances · Supplier Aging¹                                   |
| Purchases        | Purchases by Period · Purchases by Supplier · Purchases by Product · Purchases by Category |
| Payments         | Payments Report · Payments by Supplier · Payment Discounts                                 |
| Purchase Returns | Purchase Returns Report                                                                    |
| Products         | Product Movement · Last Purchase Price · Inactive Products                                 |
| Attachments      | Missing Attachments · Attachments Report                                                   |
| System           | Audit Log Report (available after the Audit phase, BDD-010)                                |

## Deferred Detail (one decision still required)

- **¹ Supplier Aging — contents deferred.** The report is approved as a
  catalog entry, but its **aging buckets** (e.g. current / 31–60 / 61–90 /
  90+) and its **aging method** are undefined and are **not implied by the
  running-balance model** (DL-016: payments reduce the overall supplier
  balance with no per-invoice allocation). Producing an aged breakdown
  requires the owner to state (a) the bucket boundaries and (b) how the
  balance is aged (e.g. by purchase-document date, oldest-first). Until then
  the report screen is not built. **Decision Pending (aging buckets + method).**

## Engineering Notes

- R1 applies: reports are rebuildable from recorded data; re-running with the
  same inputs on the same data yields the same output.
- Reports can only show what documents record; no report adds new stored
  fields.
- Common parameters: date range, supplier, product, category (per report).
- PDF/Excel are engineering-chosen technical channels; format details are an
  implementation concern, not a further business decision.

## Future Expansion

- Tax filings — out of scope (PD-08 approved: no tax, DL-022).
- Aging once its buckets/method are decided (removes the deferral above).

## Decision Table

| Decision                                 | Status                         |
| ---------------------------------------- | ------------------------------ |
| List of reports (PD-15)                  | Approved (catalog above)       |
| Contents per report (PD-15)              | Approved except Supplier Aging |
| Supplier Aging buckets & method          | Pending                        |
| Periods and filters (PD-15)              | Approved (per report, 07)      |
| Output channels (Screen/Print/PDF/Excel) | Approved                       |
