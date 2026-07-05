# 03 — UI Specification

> Design only. Binding visual/behavioral rules for every screen in
> `02_Screen_Flow.md`. Colors, typography, spacing, radius, and shadows are
> NOT redefined here — the canonical tokens are `lib/theme/*` (DL-006); this
> document only assigns their roles.

## 1. Layout

- **Direction:** the entire application is RTL (`dir="rtl"` at the document
  root — already the case). All layout terms below are logical
  (start = right, end = left).
- **Shell grid:** fixed sidebar at the inline-start (right), 260px; header
  56px; content area max-width 1280px, centered, padded by the `spacing`
  scale.
- **Content pattern:** page title row (title + primary action) → breadcrumb
  → toolbar (search/filters) → content (table/cards/form) → pagination.
- **Density:** comfortable by default; tables use compact row height on
  lists with > 25 rows per page.

## 2. Navigation

- **Sidebar:** grouped items — Overview (Dashboard) · Documents (Purchases,
  Returns, Payments) · Master data (Suppliers, Products, Categories, Units,
  Currencies) · Archive (Attachments) · Insight (Reports, Audit Log) ·
  System (Settings). Active item highlighted with the primary color token;
  collapsible to icons at narrow widths.
- **Header:** global SearchBox center; "+ new" split-button (Purchase /
  Return / Payment); no user menu in v1 (single user) beyond an app menu
  (About, Settings shortcut).
- **Breadcrumb:** `Module / Record` (e.g. «المشتريات / PU-…»); each segment
  navigates; current segment unlinked.

## 3. Core surfaces

- **Cards:** used for detail headers, dashboard tiles, and report summaries.
  Radius and shadow from theme tokens; title, optional metric, optional
  footer action.
- **Tables (DataTable):** RTL column order (first data column at the right);
  numeric columns (amounts, quantities) are left-aligned. Digit style for
  amounts — Arabic-Indic (٠١٢) vs Latin (012) — is **BUSINESS DECISION
  REQUIRED (BDR-17)**; the design exposes it as a Settings display option
  either way. Sticky header; row hover; row click opens detail; per-row
  action menu at the row end.
- **Forms:** labels above fields; required marked with `*`; one column up to
  6 fields, two columns beyond; the lines grid in documents is a full-width
  editable table. Save actions fixed at the form footer (primary at the
  inline-start).
- **Dialogs:** centered, max-width 480px (confirm) / 720px (entry dialogs
  D-05/D-08/D-09) / full-screen (D-06 viewer). Esc closes unless an upload
  is in flight; confirm dialogs put the safe action first (RTL: rightmost).
- **Filters:** FilterPanel opens from the toolbar as an inline collapsible
  row (not a drawer); active filters render as removable chips under the
  toolbar; "clear all" appears when ≥ 1 chip.
- **Search:** every list has search-within-list (client filter of the
  current result set); the header SearchBox is global (06).
- **Pagination:** page-based, 25/page default (options 25/50/100); shows
  "n–m of total"; RTL arrows point correctly (next = left).

## 4. Visual tokens (roles only — values live in `lib/theme`)

- **Colors:** primary = brand actions/active nav; success = Posted badges
  and confirmation toasts; warning = Draft badges, over-quantity warnings;
  danger = destructive confirms, validation errors; neutral scale =
  text/surfaces/borders.
- **Typography:** the theme's Arabic-capable font stack; page title,
  section title, body, caption levels per `lib/theme/typography`. Amounts
  use tabular numerals wherever the font provides them.
- **Spacing:** all paddings/gaps from `lib/theme/spacing`; no ad-hoc pixel
  values in specs.

## 5. Responsive behavior

Primary target is desktop (single professional user). Rules:

- ≥ 1280px: full layout.
- 1024–1279px: sidebar collapses to icons; two-column forms become one.
- 768–1023px: tables drop secondary columns (each table defines its
  keep-list in 04 §DataTable); toolbar wraps.
- < 768px: navigation becomes a top drawer; document entry (S-22/32/42)
  shows a "best on a larger screen" notice but remains functional; print
  views are desktop/print-only.

## 6. RTL rules

1. Logical properties everywhere (start/end, never left/right).
2. Icons with direction (arrows, chevrons) flip; icons without direction
   (attach, print, search) do not.
3. Numbers, dates, and document numbers render LTR **within** RTL text
   (isolated with direction isolation), so «PU-2026-0042» never breaks.
4. Tables: first column right; row action menu at the far left.
5. Mixed input fields (reference numbers, phone) force LTR input direction
   with start-aligned text.
6. Print layouts are RTL with the same isolation rules (05).

## 7. States

- **Loading:** skeleton rows for tables (5 rows), skeleton tiles for
  dashboard; inline spinner only inside buttons during submit; no full-page
  spinners after first paint.
- **Empty:** every list defines an empty state = icon + one sentence + the
  primary action (e.g. Suppliers: «لا يوجد موردون بعد» + "New supplier").
  Filtered-empty differs: "no results for these filters" + clear-filters.
- **Error:** load failures show a retry card with the error message from
  the Result error (`AppError.message`), never a blank screen.

## 8. Validation messages

- Shown inline under the field, danger color, after first blur or on
  submit; the first invalid field is scrolled into view and focused.
- Messages are Arabic, short, and name the requirement («الاسم مطلوب»,
  «الكمية يجب أن تكون أكبر من صفر»). English never appears in the UI.
- Cross-field/document rules (e.g. return exceeds purchased — BDR-16)
  render as a banner above the lines grid, warning or danger per the
  decision.
- Server/domain failures map 1:1 to the typed error codes from `lib/core`;
  each `ErrorCode` gets one Arabic template (catalog kept with the UI copy,
  outside this doc).

## 9. Confirmation dialogs

Required before: posting (D-01 — states irreversibility explicitly),
deleting a draft (D-02), archiving a supplier with balance (D-04), deleting
an attachment (D-07), and leaving dirty forms (D-03). Confirm buttons name
the action («ترحيل», «حذف») — never a bare «موافق/OK».

## 10. Notifications

- **Toasts** (bottom-start, RTL): success (posted, saved, uploaded), info,
  and error variants; auto-dismiss 5s except errors (manual dismiss);
  posting toast includes the issued number and a link to the document.
- No background/push notifications in v1 (single user, no async jobs
  designed).
