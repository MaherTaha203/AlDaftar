# 01 — System Workflow

> Design only. No implementation, no database, no APIs. Grounded in the
> approved context: single company, single user, Arabic RTL, purchasing +
> simple bookkeeping; Purchase = Goods Receipt; purchases immutable after
> posting; corrections via Purchase Return; supplier balance, inventory, and
> reports are calculated, never stored by hand.

## 0. Shared definitions

### 0.1 Document states

All business documents (Purchase, Purchase Return, Payment) share one state
model:

| State      | Meaning                                                      | Allowed actions                                   |
| ---------- | ------------------------------------------------------------ | ------------------------------------------------- |
| **Draft**  | Being entered; has no official number; affects nothing.      | Edit, Delete (BDR-15), Post, Attach files         |
| **Posted** | Official; immutable content; affects balances and inventory. | View, Print, Attach files (BDR-08), Create return |

State transitions: `(new) → Draft → Posted`. This lifecycle is **approved**
(PD-17 / DL-020). There is no transition out of Posted. Whether a posted
document can ever be voided is **BUSINESS DECISION REQUIRED (BDR-07)** — until
decided, the only correction path is a Purchase Return (approved decision).

> **Locked (deferred).** PD-17 also names a `Posted → Locked` state, but its
> trigger and its effect beyond Posted's existing immutability are undefined,
> it presupposes the reversal policy still open under BDR-07, and a
> document-level lock is in tension with PD-14 (no closing/reopening). It is
> **not implemented** until BDR-07 and a lock trigger are decided (DL-020);
> the two-state machine above is authoritative in the meantime.

### 0.2 Calculated values (never entered, never stored by hand)

- **Supplier balance** = opening balance (BDR-06) + posted purchases −
  posted returns − posted payments (± discounts per BDR-03).
- **Inventory quantity per product** = posted purchase quantities − posted
  return quantities.
- **All report figures** are derived from posted documents at read time.

### 0.3 Business Decision Registry (BDR)

Referenced from every design document. Each item blocks only its own detail;
the design continues around it.

| ID     | BUSINESS DECISION REQUIRED                                                                                                                                                                          |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BDR-01 | **APPROVED (2026-07-04):** independent plain-integer sequence per document type (1, 2, 3…; no prefix/year), never reset, never reused, assigned only at posting; internal UUID hidden. See BDD-005. |
| BDR-02 | **APPROVED (2026-07-04):** single bookkeeping currency ILS; 2 decimal places; half-up rounding; no foreign currency in v1 — currency fields hidden. See BDD-006.                                    |
| BDR-03 | Discounts: where a supplier discount applies — per line, per document, at payment time, or several.                                                                                                 |
| BDR-04 | Payment allocation: payments tied to specific purchases or recorded against the supplier balance.                                                                                                   |
| BDR-05 | Payment methods list (cash, bank transfer, cheque, …).                                                                                                                                              |
| BDR-06 | Supplier opening balances: allowed? source? editable after first posted document?                                                                                                                   |
| BDR-07 | Void policy: may a posted document ever be voided, or are returns the only correction?                                                                                                              |
| BDR-08 | Attachments: accepted types/sizes; may files on posted documents be replaced/deleted; retention.                                                                                                    |
| BDR-09 | **RESOLVED (2026-07-04):** no tax system in v1 — tax is out of scope (PD-08). See DL-022.                                                                                                           |
| BDR-10 | **APPROVED (2026-07-04):** fixed report catalog in `07_Report_Catalog.md`; every report supports Screen/Print/PDF/Excel; Supplier-Aging contents deferred. See DL-026 / BDD-009.                    |
| BDR-11 | **APPROVED (2026-07-04):** immutable append-only trail of Create/Update/Delete/Post/Unpost/Login/Logout (Unpost/Login/Logout reserved, no producer yet). See DL-021 / BDD-010.                      |
| BDR-12 | Backup/recovery expectations (acceptable data-loss window).                                                                                                                                         |
| BDR-13 | Categories: flat list or hierarchy (tree).                                                                                                                                                          |
| BDR-14 | Products: is a product code mandatory, and who defines it.                                                                                                                                          |
| BDR-15 | Drafts: may a draft be deleted permanently, and is the deletion recorded in the audit log.                                                                                                          |
| BDR-16 | Inventory: is negative calculated stock acceptable (e.g. return exceeding purchases), warn or block.                                                                                                |
| BDR-17 | **APPROVED (2026-07-04):** Latin (Western) numerals 0–9 for amounts and numbers in UI and print. See DL-027.                                                                                        |
| BDR-18 | **APPROVED (2026-07-04):** dates display as DD/MM/YYYY (Gregorian; no Hijri). ISO yyyy-mm-dd remains the storage form. See DL-028.                                                                  |
| BDR-19 | **APPROVED (2026-07-04):** "amount in words" (Arabic) is required, shown only on printed documents. See DL-029.                                                                                     |

## 1. Supplier workflows

### 1.1 Create supplier

1. **Start:** user opens Suppliers → "New supplier".
2. Enter name (required, unique — duplicate check at save).
3. Optional: contact info, notes, opening balance (**BDR-06** — field shown
   only if approved).
4. **Decision:** save?
   - Save → supplier created **Active**; audit entry (BDR-11); go to
     supplier detail.
   - Cancel → nothing persisted.
5. **Result:** supplier available for selection in documents.

### 1.2 Edit supplier

Editable at any time (master data has no Draft/Posted states). Changes are
audit-logged with before/after (BDR-11). Name uniqueness re-checked.

### 1.3 Archive / reactivate supplier

1. **Start:** supplier detail → "Archive".
2. **Decision point:** does the supplier have a non-zero calculated balance?
   - Yes → warning dialog shows the balance; user may proceed or cancel
     (archiving hides from pickers; it never deletes history).
   - No → confirm dialog.
3. **Result:** status Archived; supplier no longer appears in document
   pickers; existing documents unaffected; reactivation is the mirror action.
   Suppliers are never deleted once referenced by any document.

## 2. Purchase workflow (Purchase = Goods Receipt)

### 2.1 Record purchase

1. **Start:** Purchases → "New purchase" → Draft created on first save.
2. Select supplier (Active only), date (defaults to today), currency
   (**BDR-02**: single currency hides this field).
3. **Decision:** did a supplier invoice arrive with the goods?
   - Yes → record supplier invoice reference (their number/date) and attach
     scan.
   - No → mark "بدون فاتورة مورد / without supplier invoice"; reference can
     be added later **only while Draft** (immutability rule); after posting,
     the arriving invoice is attached as a file (§5) — content unchanged.
4. Add lines: product (picker; quick-create allowed), quantity (> 0), unit
   (defaults from product), unit price, line discount (**BDR-03**).
5. Document-level discount (**BDR-03**), tax (**BDR-09** — omitted until
   decided), totals calculated live.
6. Attach files (goods photos, delivery notes) at any point.
7. **Decision:** Post now or keep Draft?
   - Keep Draft → remains editable; appears in "Drafts" filter; affects
     nothing.
   - Post → confirmation dialog summarizing supplier, total, line count.
8. **On Post (atomic):** state → Posted; official number issued (BDR-01);
   supplier balance and inventory recalculations now include it; audit entry.
9. **Result:** immutable purchase; printable (see
   `05_Printing_Specification.md`).

### 2.2 Correct a posted purchase

Not possible by editing (approved). Paths:

- Quantity/price wrong, goods going back → **Purchase Return** (§3).
- Wrong supplier / duplicate entry → **BDR-07** decides whether void exists;
  until then the workaround is a full-quantity return, and the design keeps a
  visible "corrected by return" link on both documents.

## 3. Purchase Return workflow

1. **Start:** either Purchases → posted purchase → "Create return", or
   Purchase Returns → "New return".
2. If started from a purchase: lines pre-filled from that purchase with
   returnable quantities (already-returned quantities deducted). If started
   standalone: select supplier, add lines manually — whether a return may
   exist without referencing a purchase follows the same decision as
   over-return, below.
3. Enter returned quantity per line.
   - **Decision point:** returned quantity exceeds what was purchased (or
     stock goes negative) → **BDR-16**: warn or block.
4. **Decision:** Post?
   - Post → confirmation; state → Posted; number issued (BDR-01); supplier
     balance decreases; inventory decreases; audit entry; link recorded to
     the original purchase (when referenced).
5. **Result:** immutable return; printable.

## 4. Payment workflow

1. **Start:** Payments → "New payment", or supplier detail → "Pay".
2. Select supplier; enter amount (> 0), date, method (**BDR-05**), reference
   (e.g. transfer number), notes; attach proof (receipt image).
3. **Decision (BDR-04):** allocation model —
   - If allocation to purchases is approved: screen lists the supplier's
     posted purchases with open amounts; user distributes the payment;
     over-allocation blocked; unallocated remainder handling is part of
     BDR-04.
   - If running-balance is approved: no allocation step; payment simply
     reduces the calculated balance.
     The screen flow (`02_Screen_Flow.md`) designs the allocation panel so it
     can be shown or hidden by this decision without redesign.
4. Discount at payment time (settlement discount) — **BDR-03**: if approved,
   entered here as a separate, clearly-labeled amount, not mixed with the
   paid amount.
5. **Decision:** Post? → confirmation; state → Posted; number issued
   (BDR-01); supplier balance decreases; audit entry.
6. **Result:** immutable payment; printable voucher.

## 5. Attachment workflow

1. **Start:** any of — supplier detail, purchase, return, payment, or the
   Attachments library → "Upload".
2. Select file(s) (types/sizes per **BDR-08**); enter title (defaults to file
   name) and optional note; the owning record is preset by context or chosen
   explicitly in the library.
3. Upload with progress; failure leaves no partial record (retry offered).
4. **Result:** attachment listed on the owning record and in the library;
   viewable in the viewer (images/PDF), downloadable.
5. **Delete/replace decision point:** allowed while the owner is Draft;
   for Posted owners → **BDR-08**. Deletion (when allowed) requires
   confirmation and is audit-logged.

## 6. Audit workflow (automatic)

- Every state-changing action (create/edit/archive master data; create/edit
  draft; post; upload/delete attachment; settings change) writes one audit
  entry: timestamp, action, record reference, compact summary. Scope and
  retention: **BDR-11**.
- The Audit Log module is read-only: list, filter by period/module/action,
  view entry detail. No edit, no delete, ever.

## 7. Settings workflow

1. **Start:** Settings from the sidebar.
2. Sections: Company profile (name, logo for printing), Currency (**BDR-02**),
   Numbering (**BDR-01**), Attachments limits (**BDR-08**), Backup
   (**BDR-12**).
3. Each section saves independently; every change is audit-logged with
   before/after.
4. **Guard decision points:** changing currency or numbering after any
   posted document exists → blocked with explanatory message (both BDRs must
   define whether any change is ever allowed later).

## 8. Dashboard workflow

1. **Start:** default screen after opening the app.
2. Loads calculated tiles (see `07_Report_Catalog.md` R-01): total payable,
   supplier count, purchases this month, recent documents, drafts awaiting
   posting.
3. **Decision points:** every tile navigates to its module filtered
   accordingly (e.g. "drafts" tile → Purchases list filtered to Draft).
4. Empty state (fresh system): onboarding hints — create supplier, record
   first purchase.

## 9. Reports workflow

1. **Start:** Reports from the sidebar → catalog of reports (07).
2. Select report → parameter panel (period, supplier, product… per report).
3. Generate → results on screen (calculated live from posted documents).
4. **Decisions:** Print (05) / Export (**BDR-10**) / adjust parameters.
5. Reports never write anything.

## 10. Search workflow

1. **Start:** global search box in the header (or keyboard shortcut `/`).
2. Typing ≥ 2 characters → grouped instant results (suppliers, products,
   documents by number or supplier-invoice reference, attachments by title) —
   priorities in `06_Search_Specification.md`.
3. **Decision:** pick a result → its detail screen; or "show all results" →
   full results screen with filters; or Esc → close.
4. **Result:** navigation only; search changes nothing.
