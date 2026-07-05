# 06 — Search Specification

> **Approved (PD-16, owner 2026-07-04; DL-025).** Global instant search covers
> **suppliers, products, purchases, payments, and purchase returns**, matching
> on **name, number, and code**. Search is strictly read-only and
> authoritative for nothing (business architecture R1). **Attachment-title
> search below is deferred** — it is outside the approved v1 scope and is kept
> here as the design for a later addition, not built in v1.

## 1. Global search (header SearchBox)

### 1.1 Behavior

- Activated by click or the `/` shortcut; minimum 2 characters; debounced
  (~300ms); results in a dropdown panel grouped by type, max 5 per group,
  with a per-group «عرض الكل / show all» link → S-99 filtered to that type.
- Keyboard: ↑/↓ move, Enter opens, Esc closes; the panel is fully
  RTL-ordered.
- Empty result: «لا نتائج لـ "…"» + link to advanced search.
- Matching is case-insensitive and **Arabic-normalized**: hamza forms
  (أ/إ/آ → ا), teh marbuta (ة → ه), alef maqsura (ى → ي), and diacritics
  ignored, so «فاطمه» finds «فاطمة».

### 1.2 Scope and match fields

| Group       | Matched on                                                      |
| ----------- | --------------------------------------------------------------- |
| Suppliers   | name, phone                                                     |
| Products    | name, code (BDR-14)                                             |
| Purchases   | document number, supplier-invoice reference, supplier name      |
| Returns     | document number, original purchase number, supplier name        |
| Payments    | document number, reference (transfer/cheque no.), supplier name |
| Attachments | title, note                                                     |

Attachment **content** (OCR) is out of scope (business architecture §4
future possibility).

### 1.3 Priority (result ordering)

1. Exact document-number match (any document type) — always first.
2. Suppliers (name prefix match before contains).
3. Products.
4. Documents by supplier-invoice reference / payment reference.
5. Documents by supplier name (most recent first).
6. Attachments.

Within a group: prefix matches before contains; then recency (documents) or
alphabetical (master data). Archived master data appears last, badged
«مؤرشف».

## 2. Full results screen (S-99)

- URL `search?q=…&type=…`; grouped sections or single-type view; each row
  shows type icon, primary text with the match highlighted, secondary
  context (supplier, date, amount), and status badge.
- Filters: type, period (documents), status. Pagination per 03 §3.

## 3. In-list search

Every list screen's toolbar search filters the **current module only**,
querying the same fields as §1.2 for that type plus its visible columns.
It combines with active FilterPanel filters (AND).

## 4. Filters (per module — the FilterPanel contents)

| Screen | Filters                                                                    |
| ------ | -------------------------------------------------------------------------- |
| S-10   | status (active/archived), balance ≠ 0                                      |
| S-20   | status (Draft/Posted), supplier, date range, with/without supplier invoice |
| S-30   | status, supplier, date range, linked/standalone                            |
| S-40   | status, supplier, date range, method (BDR-05)                              |
| S-50   | status, category, unit, stock ≠ 0                                          |
| S-70   | owner type, file type, date range                                          |
| S-90   | period, module, action                                                     |

All filter state lives in the URL (04 §FilterPanel) so any filtered view is
bookmarkable.

## 5. Advanced search

- Entry: link at the bottom of the global-search panel and on S-99.
- A form combining: free text + type + supplier + date range + amount range
  - status + with/without supplier invoice; results in the S-99 layout.
- Saved searches: **not in v1** (single user, low volume — deliberate
  simplicity per ADR-0001); listed as a future possibility.

## 6. Non-goals

- No fuzzy/typo tolerance beyond Arabic normalization in v1.
- No search across attachment file contents (future OCR).
- No search-driven bulk actions; search only navigates.
