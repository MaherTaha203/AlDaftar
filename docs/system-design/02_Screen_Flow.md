# 02 — Screen Flow

> Design only. Every screen, dialog, and navigation path. Arabic RTL UI;
> screen titles listed as Arabic / English. BDR-xx references point to the
> Business Decision Registry in `01_System_Workflow.md` §0.3.

## 1. Application shell

- **Sidebar (right, RTL):** Dashboard, Suppliers, Purchases, Purchase
  Returns, Payments, Products, Categories, Units, Currencies, Attachments,
  Reports, Audit Log, Settings.
- **Header:** global search box (center), quick actions ("+ شراء جديد /
  New purchase"), app title.
- **Breadcrumb** under the header on every screen except Dashboard.
- Every list screen follows one pattern: toolbar (primary action, search,
  filters) → data table → pagination. Every detail screen: header card
  (identity + status + actions) → tabs.

## 2. Screen inventory

IDs are used by all navigation references below and by
`08_User_Journey.md`.

| ID   | Screen (AR / EN)                                  | Type        |
| ---- | ------------------------------------------------- | ----------- |
| S-00 | لوحة التحكم / Dashboard                           | Overview    |
| S-10 | الموردون / Suppliers list                         | List        |
| S-11 | بطاقة مورد / Supplier detail                      | Detail+tabs |
| S-12 | مورد جديد / Supplier create                       | Form page   |
| S-13 | تعديل مورد / Supplier edit                        | Form page   |
| S-20 | المشتريات / Purchases list                        | List        |
| S-21 | تفاصيل شراء / Purchase detail                     | Detail+tabs |
| S-22 | شراء جديد / Purchase create (Draft)               | Form page   |
| S-23 | تعديل شراء / Purchase edit (Draft only)           | Form page   |
| S-24 | طباعة شراء / Purchase print view                  | Print       |
| S-30 | مرتجعات الشراء / Purchase Returns list            | List        |
| S-31 | تفاصيل مرتجع / Return detail                      | Detail+tabs |
| S-32 | مرتجع جديد / Return create (Draft)                | Form page   |
| S-33 | تعديل مرتجع / Return edit (Draft only)            | Form page   |
| S-34 | طباعة مرتجع / Return print view                   | Print       |
| S-40 | المدفوعات / Payments list                         | List        |
| S-41 | تفاصيل دفعة / Payment detail                      | Detail      |
| S-42 | دفعة جديدة / Payment create (Draft)               | Form page   |
| S-43 | تعديل دفعة / Payment edit (Draft only)            | Form page   |
| S-44 | طباعة سند دفع / Payment voucher print             | Print       |
| S-50 | المنتجات / Products list                          | List        |
| S-51 | بطاقة منتج / Product detail                       | Detail+tabs |
| S-60 | التصنيفات / Categories list                       | List        |
| S-61 | الوحدات / Units list                              | List        |
| S-62 | العملات / Currencies list                         | List        |
| S-70 | الأرشيف / Attachments library                     | List        |
| S-80 | التقارير / Reports hub                            | Hub         |
| S-81 | شاشة تقرير / Report screen (one per report, R-xx) | Report      |
| S-82 | طباعة تقرير / Report print view                   | Print       |
| S-83 | كشف حساب مورد / Supplier statement (R-02)         | Report      |
| S-90 | سجل العمليات / Audit log list                     | List        |
| S-91 | تفاصيل عملية / Audit entry detail                 | Detail      |
| S-95 | الإعدادات / Settings                              | Sections    |
| S-99 | نتائج البحث / Global search results               | List        |

## 3. Dialogs and popups

| ID   | Dialog                                  | Trigger / content                                                                           |
| ---- | --------------------------------------- | ------------------------------------------------------------------------------------------- |
| D-01 | Confirm post                            | "Post" on S-22/32/42 — summary (supplier, total, lines); Post / Cancel. Irreversible note.  |
| D-02 | Confirm draft delete                    | Delete on a Draft (BDR-15); type-nothing simple confirm.                                    |
| D-03 | Unsaved changes                         | Navigating away from a dirty form; Stay / Discard.                                          |
| D-04 | Archive supplier warning                | §1.3 of 01 — shows calculated balance if non-zero.                                          |
| D-05 | Upload attachment                       | File select/drop, title, note, owner (preset by context).                                   |
| D-06 | Attachment viewer                       | Full-screen image/PDF viewer; download; prev/next within owner.                             |
| D-07 | Confirm attachment delete               | Only where allowed (BDR-08); audit note.                                                    |
| D-08 | Quick-create: product / category / unit | From within a picker on S-22/S-32 — minimal fields; returns selection to the form.          |
| D-09 | Master-data create/edit                 | Categories, Units, Currencies rows (S-60/61/62) edit in dialog, not separate pages.         |
| D-10 | Payment allocation panel                | Inside S-42; distribution across open purchases — shown only if BDR-04 approves allocation. |
| D-11 | Blocked-action explainer                | E.g. changing currency after posting exists (01 §7).                                        |

## 4. Screen-by-screen definition

### S-00 Dashboard

Tiles (each → navigates): total payable (→ R-01), purchases this month
(→ S-20 filtered), drafts pending (→ S-20 Draft filter), recent documents
list (→ each document), low activity/empty-state onboarding when fresh.

### S-10 Suppliers list

Columns: name, phone, calculated balance, status, last document date.
Filters: status, balance ≠ 0. Row click → S-11. Toolbar: New (→ S-12),
search-in-list, print list (→ report R-03).

### S-11 Supplier detail

Header card: name, status, calculated balance (prominent), actions (Edit →
S-13, Archive → D-04, Pay → S-42 pre-filled, New purchase → S-22
pre-filled). Tabs:

1. **Statement** — embedded R-02 (opening balance BDR-06, documents in date
   order, running balance) + Print (→ S-83 print).
2. **Purchases** — supplier's purchases (mini S-20).
3. **Returns** — mini S-30.
4. **Payments** — mini S-40.
5. **Attachments** — supplier-level files (D-05/D-06).
6. **Info** — contacts, notes.

### S-12 / S-13 Supplier create / edit

Single-column form: name*, phone, address, tax/registration reference,
notes, opening balance (BDR-06). Save → S-11. Cancel → back (D-03 if dirty).

### S-20 Purchases list

Columns: number (or "مسودة/Draft"), date, supplier, supplier-invoice ref
(or "بدون فاتورة / no invoice" badge), total, status badge. Filters: status,
supplier, period, with/without supplier invoice. Row → S-21 (Posted) or
S-23 (Draft). Toolbar: New (→ S-22).

### S-21 Purchase detail (Posted)

Header: number, date, supplier (link → S-11), status, totals; actions:
Print (→ S-24), Create return (→ S-32 pre-filled), copy as new draft.
No edit action exists for Posted (approved immutability). Tabs: Lines
(read-only table), Attachments, Related (returns created from it), Audit
(entries for this document).

### S-22 / S-23 Purchase create / edit (Draft)

Two zones: document header (supplier*, date*, supplier-invoice ref +
"no invoice" toggle — no currency field: BDR-02 approved single ILS) and
lines grid (product picker with D-08 quick-create, quantity, unit, unit
price, line discount [BDR-03 residual — not modeled; approved discount is at
payment], line total). Footer: tax [BDR-09 — absent until decided], grand
total (calculated, read-only, ILS). Actions: Save draft, Post (→ D-01),
Attach (→ D-05), Delete draft (→ D-02, pending BDR-15).

### S-30…S-34 Purchase Returns

Mirrors purchases. S-32 started from S-21 pre-fills returnable lines
(already-returned quantities deducted); standalone start selects supplier
first. Over-quantity behavior per BDR-16 (inline warning or block).

### S-40 Payments list / S-41 detail / S-42 create / S-44 print

List columns: number, date, supplier, amount, method (BDR-05), status.
S-42: supplier*, date*, amount*, method [BDR-05], reference, notes,
settlement discount [BDR-03], allocation panel D-10 [BDR-04], attach proof.
S-41: read-only detail + allocations (if any) + attachments + Print → S-44.

### S-50 / S-51 Products

List: name, code (BDR-14), category, unit, calculated stock quantity,
status. Detail tabs: info, movement (purchases/returns touching it),
calculated quantity. Create/edit via D-09-style dialog or S-51 edit mode.

### S-60 / S-61 / S-62 Categories, Units, Currencies

Simple managed lists with D-09 dialogs. Categories flat until BDR-13.
Currencies list exists as master data; its role in documents is gated by
BDR-02. Deletion allowed only when unreferenced; otherwise archive.

### S-70 Attachments library

All files across the system. Columns: title, owner (typed link), type,
size, date. Filters: owner type, period, file type. Row → D-06 viewer.
Upload → D-05 (with explicit owner selection).

### S-80 / S-81 / S-82 Reports

Hub lists the catalog from `07_Report_Catalog.md` grouped by area. Each
report screen: parameter bar → results table/cards → Print / Export
(BDR-10).

### S-90 / S-91 Audit log

List: time, action, module, record link, summary. Filters: period, module,
action. Detail shows before/after (where captured). Strictly read-only.

### S-95 Settings

Sections (anchored side-nav within the screen): Company profile, Currency
(BDR-02), Numbering (BDR-01), Attachments (BDR-08), Backup (BDR-12).
Guarded fields show D-11 when locked by posted history.

### S-99 Search results

Grouped by type with counts; same filters as 06; row → detail screen.

## 5. Navigation map (primary paths)

- Sidebar → S-00, S-10, S-20, S-30, S-40, S-50, S-60, S-61, S-62, S-70,
  S-80, S-90, S-95.
- S-10 → S-11 → (S-13, S-22*, S-42*, D-04, S-83) — \*pre-filled with the
  supplier.
- S-20 → S-21 → (S-24, S-32*, S-11) ; S-20 → S-22 → D-01 → S-21.
- S-30 → S-31 → (S-34, S-21 via original-purchase link).
- S-40 → S-41 → (S-44, S-11) ; S-40 → S-42 → D-01 → S-41.
- S-50 → S-51 → movement rows → S-21/S-31.
- S-70 → D-06 → owner record (S-11/S-21/S-31/S-41).
- S-80 → S-81/S-83 → S-82 print.
- Header search → instant results → any detail; or → S-99.
- Every detail breadcrumbs back to its list; browser back is always safe
  (forms guard with D-03).

## 6. URL structure (design-level)

`/` dashboard · `/suppliers` · `/suppliers/{id}` · `/purchases` ·
`/purchases/{id}` · `/purchases/new` · `/purchase-returns…` · `/payments…` ·
`/products…` · `/categories` · `/units` · `/currencies` · `/attachments` ·
`/reports` · `/reports/{report-id}` · `/audit-log` · `/settings` ·
`/search?q=`. Print views are `/…/{id}/print`. (Routing conventions only —
no implementation implied.)
