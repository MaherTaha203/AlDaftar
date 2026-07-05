# Phase Preparation — Readiness Analysis

> **Historical (superseded 2026-07-05).** This was a point-in-time readiness
> analysis written while P18–P22 were blocked. Those phases are now delivered;
> for current status see `development-plan.md`. Retained as a record of the
> pre-implementation planning, not as a live document.

> **Mode:** business implementation is blocked pending owner decisions
> (`docs/business-decisions/README.md`). This document prepares the repository
> for the remaining phases **without inventing business behavior** (DL-010): it
> records only technical prerequisites, reuse, interfaces, dependencies, risks,
> and the files each phase will touch. Every business unknown stays named and
> deferred to its pending decision. Nothing here implements Reports, Dashboard,
> Printing content, Settings, or Audit business logic, and no placeholder pages
> or TODOs are introduced.

## 0. Roadmap position

Delivered and frozen through **P15**: Foundation, the application shell, the
Business Framework, and the modules Suppliers, Products, Categories, Units,
Currencies, Purchases, Purchase-returns, Payments (P14), Attachments (P15).

The roadmap as recorded (`development-plan.md`) defines **no P16/P17** — the
numbering of remaining defined phases resumes at **P18**. This analysis covers
every phase after the last delivered work: **P18 Reports, P19 Settings, P20
Audit log, P21 Print views, P22 Dashboard.** All five are **BUSINESS-BLOCKED**;
this document changes none of that — it makes each phase turnkey the moment its
decision lands.

## 1. Shared infrastructure every future phase reuses

The prior phases front-loaded decision-free infrastructure. All five remaining
phases build on it with **no new plumbing**:

| Capability                       | Provided by                                                                                | Reused by                  |
| -------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------- |
| Persistence seam (Supabase swap) | `lib/modules/shared/repository-factory.ts`, `local-record-store.ts`, `local-file-store.ts` | all                        |
| Result/error/logging core        | `lib/core` (Result, errors, logging, guards)                                               | all                        |
| Application service base         | `lib/application/services/application-service.ts` (ADR-0001)                               | P18, P20                   |
| Async op + Arabic errors         | `components/framework/use-operation.ts`, `error-messages.ts`                               | all                        |
| List screen template             | `components/framework/list-page.tsx` (+ DataTable, Pagination, SearchBox)                  | P18, P20                   |
| Form screen template             | `components/framework/form-page.tsx` (+ dirty guard)                                       | P19                        |
| Master-data picker               | `components/framework/entity-picker.tsx`                                                   | P18 (report params)        |
| Money rendering                  | `components/ui/money-display.tsx`, `format.ts`, `lib/modules/shared/money.ts`              | P18, P22                   |
| Metric tiles                     | `components/ui/stat-card.tsx`                                                              | P22                        |
| Tabs / status / badges           | `components/ui/{tabs,document-status,status-badge}.tsx`                                    | P19, P20, P22              |
| Date entry / filters             | `components/ui/{date-picker,filter-panel}.tsx`                                             | P18                        |
| Route titles / breadcrumbs / nav | `components/app/{routes.ts,navigation.tsx,breadcrumbs.ts}`                                 | all (links already exist)  |
| **Print scaffold (new, §4)**     | `components/layout/print-layout.tsx`, `styles/print.css`                                   | P21, and P18 report prints |

The sidebar already lists **التقارير / سجل العمليات / الإعدادات / لوحة التحكم**;
those links resolve to the framework 404 until their phase (by design,
`technical-debt.md`). No navigation work remains for any phase.

## 2. Per-phase preparation

### P18 — Reports (`/reports`, S-80/S-81/S-82)

- **Blocking decision(s):** **BDR-10 / PD-15** — the report catalog, exact
  contents, and export formats (`07_Report_Catalog.md` is a proposal;
  `BDD-009` is a template). Individual reports also depend on **BDR-03**
  (discounts, R-09), **BDR-06** (opening balance, R-02), **BDR-16** (negative
  stock flag, R-08).
- **Technical prerequisites (all present):** live read-model calculation from
  posted documents (system-architecture §7 — balances/inventory are never
  stored); the module services already expose the posted documents each report
  reads.
- **Existing reusable components:** `ListPage` composition (title → toolbar →
  `DataTable` → `Pagination`), `FilterPanel` (date range, supplier/product/
  category `Select`/`EntityPicker`, toggles; URL-reflected), `DatePicker`,
  `MoneyDisplay`, `EmptyState`/`ErrorState`, and the new `PrintLayout` for
  report prints (S-82).
- **Required interfaces (decision-free shape):** a read-only report service per
  report returning `AsyncResult<Row[]>` from existing module repositories via
  `RepositoryFactory`; parameters as a typed params object; **the row shapes
  and the catalog itself are BDR-10.**
- **Dependencies:** posted-document read models across Suppliers, Purchases,
  Purchase-returns, Payments, Products; `PrintLayout` (§4).
- **Risks:** inventing catalog entries or export formats (forbidden — BDR-10);
  cross-module read models must stay calculation-only (never persist a report);
  performance of live aggregation over localStorage (TD-004) at volume.
- **Files likely created:** `app/(app)/reports/page.tsx` (+ per-report routes/
  `…/print`), `components/modules/reports/*`, `lib/modules/reports/*`.
- **Files likely modified:** none structural — `navigation.tsx`/`routes.ts`
  already resolve `/reports`.

### P19 — Settings (`/settings`, S-95)

- **Blocking decision(s):** **BDR-08** (attachment limits), **BDR-12** (backup),
  **BDR-17** (digit style), **BDR-18** (date display). Company-profile,
  Currency (BDR-02 ✓), and Numbering (BDR-01 ✓) sub-sections are decision-ready;
  the section also audit-logs, which depends on **P20**.
- **Technical prerequisites (present):** `FormPage` scaffolding + dirty guard;
  a settings record persisted through `RepositoryFactory` (single-collection,
  same seam as every module).
- **Existing reusable components:** `FormPage`, `Field`/`Input`/`Select`/
  `Textarea`, `Tabs` (settings sections), `useOperation`, toast.
- **Required interfaces (decision-free shape):** a `SettingsService`
  (get/update) over one settings collection; **which settings exist, their
  defaults, and validation are the BDR-08/12/17/18 decisions.**
- **Dependencies:** company-profile output feeds the `PrintLayout` company
  header (§4) and print date/digit rendering (BDR-17/18).
- **Risks:** digit-style (BDR-17) and date-display (BDR-18) are consumed by
  `MoneyDisplay`/`DatePicker`/`PrintLayout` — settling them wrong forces a
  formatting sweep; defining any setting value is inventing behavior (forbidden).
- **Files likely created:** `app/(app)/settings/page.tsx`,
  `components/modules/settings/*`, `lib/modules/settings/*`.
- **Files likely modified:** possibly `money-display.tsx` / `date-picker.tsx` /
  `format.ts` once BDR-17/18 pick a digit/date style (a formatting option, not
  a rewrite).

### P20 — Audit log (`/audit-log`, S-90)

- **Blocking decision(s):** **BDR-11 / PD-11** — whether an audit trail is
  required at all, what it records, and retention; **PD-18** — the access
  model. `BDD-010` is a template. **This phase may not start until it is even
  known to exist.**
- **Technical prerequisites (present):** the same posted-document store the
  audit view would read; `ApplicationService` + `useOperation` + `ListPage`.
- **Existing reusable components:** `ListPage`/`DataTable`, `Tabs` (the
  Related/Audit tab on detail screens, S-21), `StatusBadge`. The specified
  `AuditTrail` component (04 §3) is **intentionally not built** — building it
  would presuppose the feature exists (BDR-11).
- **Required interfaces:** undefined until BDR-11 — an audit entry has no
  approved shape.
- **Dependencies:** BDR-11 gates everything; P19 embeds the audit tab.
- **Risks:** any audit schema now is pure invention (forbidden). Highest-
  uncertainty phase.
- **Files likely created:** `app/(app)/audit-log/page.tsx`,
  `components/modules/audit/*`, `lib/modules/audit/*` — **only if BDR-11
  approves an audit trail.**
- **Files likely modified:** detail screens (add Audit tab) — deferred to P20.

### P21 — Print views (`…/print` routes, S-24/34/44/82/83)

- **Blocking decision(s):** **BDR-17** (digit style), **BDR-18** (date display),
  **BDR-19** (amount-in-words on prints); report prints depend on **P18**;
  document-print headers pull company name/logo from **P19**.
- **Technical prerequisites — NOW SATISFIED (§4):** the browser-dialog print
  mechanism (05 §7), A4 geometry/margins, RTL flow, monochrome-safe sheet,
  page-break utilities, the fixed internal-document footer note, and the draft
  watermark are delivered as the business-agnostic `PrintLayout` + `print.css`.
- **Existing reusable components:** `PrintLayout` (scaffold), `DocumentStatus`,
  `MoneyDisplay`, `DataTable` (or plain tables) for line/statement/report bodies.
- **Required interfaces (decision-free shape):** each `…/print` route composes
  `PrintLayout` with its document's data; **the rendered numbers/dates (BDR-17/
  18), amount-in-words (BDR-19), company header (P19), and per-report columns/
  orientation (BDR-10) enter only through PrintLayout's slots.**
- **Dependencies:** P19 (company header), P18 (report bodies), BDR-17/18/19.
- **Risks:** none in the scaffold; the remaining work is per-document content
  bound to the decisions above. Page-count footer («x من y») is a known
  browser-print limitation deferred to P21 content work.
- **Files likely created:** `app/(app)/{purchases,purchase-returns,payments}/
[id]/print/page.tsx`, supplier-statement print, report print routes.
- **Files likely modified:** detail screens gain a "Print" action linking to
  their `…/print` route.

### P22 — Dashboard (`/`, S-00 / R-01)

- **Blocking decision(s):** **BDR-10** — the R-01 dashboard summary is a
  report-catalog entry (`BDD-009`); its tiles and "recent documents" set are
  the catalog decision.
- **Technical prerequisites (present):** `StatCard` (metric tiles, navigates on
  click), live calculation from posted documents, `MoneyDisplay`.
- **Existing reusable components:** `StatCard`, `Card`, `MoneyDisplay`,
  `DataTable` (recent documents), `PageContainer`.
- **Required interfaces:** a read-only dashboard read-model service; **the
  specific tiles/metrics are BDR-10.**
- **Dependencies:** shares P18's read models (R-01 is a report).
- **Risks:** choosing tiles is inventing catalog content (forbidden — BDR-10).
- **Files likely created:** `app/(app)/page.tsx`, `components/modules/dashboard/*`,
  `lib/modules/dashboard/*`.
- **Files likely modified:** none structural.

## 3. Reuse verification

Every remaining phase was checked against the existing infrastructure; **each
reuses it without new foundations:**

- **Persistence:** all new services obtain storage through `RepositoryFactory`
  — the single Supabase swap seam (TD-004). No phase introduces a second
  persistence path.
- **Screens:** report and audit lists are `ListPage` instances; settings is a
  `FormPage`; dashboard is `PageContainer` + `StatCard`; prints are
  `PrintLayout`. No phase needs a new screen template.
- **Async/error/RTL/Arabic copy:** `useOperation` + `error-messages` + the
  `ui-text` catalog cover every phase; components stay business-blind (04 §5).
- **Navigation/routing:** links and route-title/breadcrumb resolution already
  exist for all four pending routes.

Conclusion: no missing foundation blocks any phase on technical grounds — only
the named business decisions do.

## 4. Duplication-reduction opportunities (recorded, not yet acted on)

Deferred deliberately because acting now would either touch delivered business
code or presuppose blocked decisions. Recorded so the owning phase captures them:

1. **Read-model layer (P18/P22):** R-01 (dashboard) is a report (07 §R-01), so
   the dashboard must consume the **same** posted-document read models as
   Reports rather than a parallel set. Build the read-model services once in
   P18 and have P22 consume them — prevents two aggregation paths over the same
   posted documents.
2. **Report screen kit (P18):** the ten proposed reports share one shape
   (params → live table → subtotals → print). A single `ReportScreen`
   configuration over `ListPage` + `FilterPanel` + `PrintLayout` would avoid ten
   near-duplicate screens — build the kit with the first report, not per report.
3. **`LinesGrid` extraction (existing debt, not a new phase):** the
   purchase / purchase-return / payment forms each render an editable lines
   grid; `04 §2` specifies one shared `LinesGrid`. Extracting it is a
   refactor of **delivered** code, so it is out of scope for preparation mode
   and left to a dedicated cleanup with full re-verification.
4. **Print-body tables (P21):** document, statement, and report prints share
   header-repeat + avoid-break table behavior — already provided as the
   `.print-repeat-head` / `.print-avoid-break` utilities in `print.css`, so
   each print body reuses them instead of re-solving page breaks.

## 5. Business-agnostic infrastructure delivered this session

Implemented with full validation (lint · typecheck · verify:theme · build all
green) because it is **certainly needed regardless of any business decision**
(instruction #9), is a **specified library piece** (04 §4 PrintLayout; 05
Printing Specification), and follows the established "master-components
delivered ahead of consumers" precedent (`technical-debt.md`):

- **`styles/print.css`** — the shared print foundation: approved A4 portrait/
  landscape geometry and margins (05 §1), `screen-only`/`print-only` visibility
  helpers, monochrome-safe paper reset, `print-avoid-break` / `print-repeat-head`
  page-break utilities, and the on-screen WYSIWYG A4 sheet. Kept separate from
  `globals.css` so the `verify:theme` guard (which reads only the `@theme`
  block) stays untouched; it reuses the theme's spacing/shadow tokens via
  `var()`.
- **`components/layout/print-layout.tsx`** (`PrintLayout`) — business-blind
  print scaffolding: title, company-header slot, meta slot, content, totals,
  signature, printed-on, and footer-note slots, an `orientation` prop, a `draft`
  watermark, and a screen-only print action using the approved browser dialog.
  It **neither invents nor formats** any business content — company profile
  (P19), digit style (BDR-17), dates (BDR-18), amount-in-words (BDR-19), and
  per-report columns (BDR-10) all enter through slots.
- **`components/ui/ui-text.ts`** — added the `print` Arabic copy group (print,
  back, draft watermark, and the fixed «مستند داخلي» internal-document note per
  05 §1), keeping copy in the central catalog (04 §5.3).

Also removed the deprecated `.github/workflows/quality.yml` stub (its recorded
follow-up), leaving the clean three-workflow CI.

## 6. Conclusion

With the print scaffold in place, **no further business-independent preparation
work remains.** Every remaining task — the report catalog (P18/P22, BDR-10),
settings values (P19, BDR-08/12/17/18), the audit model (P20, BDR-11), and
print content/formatting (P21, BDR-17/18/19) — requires an owner decision.
Preparation stops here per the neutrality rule (DL-010).
