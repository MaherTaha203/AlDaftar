# Technical Debt Register

Authoritative log of accepted technical debt (execution-contract Technical Debt
Policy). Every entry states Reason, Impact, Priority, and Removal Plan. Nothing
is added here silently; nothing is removed without a corresponding code change.

An empty table means zero accepted debt.

## Accepted debt

| ID     | Item                                                                                                                               | Reason                                                                                                                                                                            | Impact                                                                                                                                                                                                                     | Priority | Removal Plan                                                                                                                                                                                               |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TD-001 | `AttachmentViewer` image zoom > 1 clips the image instead of panning.                                                              | Panning needs a drag/scroll transform model not required to view invoices/receipts, which fit the viewport at 1× and download cleanly.                                            | Cosmetic only; large images can be downloaded to inspect detail. No functional or data impact.                                                                                                                             | Low      | Add pan (pointer-drag / scroll) to the viewer when a real need appears; component API is unchanged.                                                                                                        |
| TD-002 | `MoneyInput` silently normalizes invalid/negative input to `null` on blur (no message).                                            | Field-level surfacing of "invalid amount" is a form-tier concern (validation tiers, business-architecture R5), not the control's job.                                             | User sees the field clear rather than an inline error; the owning form still validates and messages.                                                                                                                       | Low      | When forms are built (Business Framework, Phase 6.5+), the field-level message is owned by `Field`.                                                                                                        |
| TD-003 | Automated test coverage is limited to the pure/technical logic layer; module services and React components have no unit tests yet. | The runner (Vitest) and a foundational pure-logic suite are now in place (DL-019); service/component tests grow with each module phase rather than being back-filled all at once. | Pure/technical logic (Result, guards, money math, domain bases, route/breadcrumb helpers) is regression-guarded by the Vitest suite in CI; higher-level module flows remain guarded by typecheck, lint, build, and review. | Medium   | Add service and component unit tests as each module phase lands; reach full-coverage targets by the Production Readiness phase (Phase 29).                                                                 |
| TD-004 | Business-module persistence uses the browser local-store adapter (`lib/modules/shared/local-record-store.ts`), not Supabase.       | Approved rule: infrastructure availability never blocks development; the Supabase free-project limit blocks provisioning (decision pending with the owner).                       | Data lives in the browser's localStorage: single-device, cleared with browser data, no server backup. Fully functional otherwise; repository seams keep modules unaware.                                                   | High     | When a Supabase project is available: apply migrations, implement Supabase repositories behind the existing `get<Module>Repository()` factories, migrate localStorage data once, delete the local adapter. |

| TD-005 | Excel export of reports is a UTF-8 CSV (with BOM), not a native `.xlsx` workbook. | A BOM-prefixed CSV opens directly in Excel with Arabic text and numeric columns intact, and needs no dependency; a native xlsx writer would add a large client-only bundle not yet justified for a single-user tool. | Exported files open in Excel but are plain CSV, not styled/multi-sheet workbooks. Data fidelity is complete (numbers, dates DD/MM/YYYY). | Low | Swap `buildReportCsv` / `downloadCsv` (`components/modules/reports/report-export.ts`) for an xlsx writer behind the same call site if a styled workbook is required. |

| TD-006 | Small duplicated helpers: `nextNumber()` (max posted + 1) is copied in the three document services; the id→name `Map` build and a `todayIso()` helper are inlined at ~14 call sites; a few `'draft'`/`'posted'`/`'active'` string literals bypass the existing status enums. | Consolidating touches frozen service internals and many call sites; the churn/regression surface outweighs the benefit at a Release Candidate. Each copy is behavior-identical today. | Maintainability only — no behavior or data impact; the values are equivalent everywhere. | Low | Post-RC: extract a numbering helper, move `todayIso` beside `components/ui/format`, add a shared `nameMap`, and replace literals with the status enums — with tests, one module at a time. |
| TD-007 | Report aggregates `purchasesByProduct` / `purchasesByCategory` sum raw `quantity × unitPrice` then round once, whereas per-document totals round per line (`computeLineTotal`). | Reports are read-only projections; rounding once at the end is a defensible aggregate method and no stored value drifts. | A by-product / by-category report total may differ by a few agora from the sum of per-document totals. Supplier statements and balances are unaffected (they use per-line rounding consistently). | Low | Choose one rounding strategy for report aggregates if a discrepancy is ever reported; centralize it in `aggregations.ts`. |

## Interim roadmap state (tracked, not debt)

Recorded for transparency; these are planned incremental states per the approved
roadmap, not quality compromises.

- **All roadmap routes are now live.** /suppliers, /categories, /units,
  /currencies, /products, /purchases, /purchase-returns, /payments,
  /attachments, plus / (Dashboard, P22), /reports + /reports/[report] (P18),
  /settings (P19), /audit-log (P20), and the document print views
  /purchases|payments|purchase-returns/[id]/print (P21). No nav link 404s.
- **Cross-module read models are delivered** via `lib/modules/reporting`
  (business-blind aggregations over posted documents) feeding Reports and the
  Dashboard; the audit trail (`lib/modules/audit`) records create/update/
  delete/post across the write paths. `Unpost`/`Login`/`Logout` remain
  reserved audit actions with no producer (BDR-07 / auth are future).
- **BDR-08 (attachments policy) interims — pending owner decision.** The
  generic Attachments module (P15) applies conservative, reversible bounds:
  accepted types = images + PDF, 10 MB/file (engineering guardrails, one
  constant each); deletion offered only while the owning document is a
  Draft (posted-owner and master-data deletion stay disabled until BDR-08).
  Attachment titles default to the file name (D-05 title/note editing comes
  with the BDR-08 policy work). Owner: business owner. Removal: when BDD-007
  is answered.
- **Interim file storage (extends TD-004):** attachment binaries live in the
  browser's IndexedDB behind `getFileStore()` — the single swap point where
  Supabase Storage lands later; metadata rows go through the standard
  RepositoryFactory. Same single-implementation and swap rules as the record
  store.
- **BDR-16 (over-return / negative stock) interim — pending owner decision.**
  Until BDR-16 is decided, `PurchaseReturnService.post()` **blocks**
  quantities above the returnable remainder and the return form clamps the
  input to it. Reason: the conservative choice is reversible — a later
  "warn-only" decision merely loosens the check with no data repair. Owner:
  business owner. Removal/target: when BDR-16 is answered (before/with
  Reports, P18, which surfaces the "without supplier invoice" and stock
  views).
- **Master components are now all consumed:** AttachmentUpload/Viewer/List
  (P15), StatCard (Dashboard, P22), the `PrintLayout` scaffold + `print.css`
  (document print views, P21). The app-shell chrome (sidebar/header) is marked
  `screen-only` so it never appears on printed output; print views render only
  their `print-sheet`.
- **Settings v1 is the company profile only.** The attachment-limits (BDR-08)
  and backup (BDR-12) sections are shown read-only as pending; currency,
  numbering, and display format are fixed approved constants (not editable).
- **Reserved foundations — retained intentionally, not dead code (verified at
  the RC audit).** `lib/domain/**` (generic Entity/ValueObject/Identifier bases)
  is unused by application code but is exercised by the Vitest domain suite
  (DL-019) and reserved for later domain hardening; removing it would break the
  tests. `lib/infrastructure/**` (ConnectionFactory, repository/storage
  contracts, telemetry) is unused by application code today but is the approved
  engineering foundation (business-architecture F7) reserved for the Supabase
  swap (TD-004); it is retained rather than deleted so the swap seam stays
  where the architecture placed it. Both are kept by decision, not oversight.
  Follow-up when Supabase lands: reconcile the infrastructure repository/storage
  contracts (`IRepository`/`IFileStorage`) with the live module contracts
  (`MasterRepository`/`FileStore`) so the swap targets one shape.
