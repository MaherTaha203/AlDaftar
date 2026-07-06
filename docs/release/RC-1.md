# Release Candidate — RC-1

## RC Version

**v1.0.0-rc.1** (package version `1.0.0`; RC tag recommended `v1.0.0-rc.1`).

## Completion Date

2026-07-05 (Release Candidate audit and certification).

## Implemented Features

All roadmap surfaces are live; every navigation link resolves.

- **Master data:** Suppliers, Products, Categories, Units, Currencies
  (create / edit / archive, active-first Arabic-collated lists).
- **Documents (Draft → Posted, immutable after posting):** Purchases
  (goods receipt), Purchase Returns (referenced, returnable-remainder guarded),
  Payments (running-balance model + separate settlement discount).
- **Attachments:** generic archive (images + PDF, 10 MB) with metadata rows
  and IndexedDB binaries behind a single swap seam.
- **Reports (P18):** catalog + data-driven view for 14 reports (Supplier
  Statement/Balances; Purchases by Period/Supplier/Product/Category; Payments
  Report/by-Supplier/Discounts; Purchase Returns; Product Movement, Last
  Purchase Price, Inactive Products; Missing Attachments, Attachments Report;
  Audit Log Report). Screen view + Print + PDF (print-to-PDF) + Excel (CSV).
- **Settings (P19):** company profile (name/logo/address/phone/tax) for print
  headers; read-only approved constants (currency, numbering, digit/date).
- **Audit Log (P20):** immutable, append-only trail wired into master-data
  create/update/archive, document create/update/post, and attachment
  upload/delete; read-only screen with before/after inspection.
- **Print (P21):** purchase invoice, payment voucher, and return document
  views via `PrintLayout` — company header, DD/MM/YYYY dates, Arabic
  amount-in-words; app-shell chrome is `screen-only` so only the sheet prints.
- **Dashboard (P22):** calculated tiles (total payable, suppliers with
  balance, month purchases/payments, drafts pending) + recent documents.
- **Production hardening (DL-030):** Arabic RTL error / global-error / 404
  boundaries; strict ISO calendar-date validation before posting; finite-number
  guards; CSV formula-injection neutralization (CWE-1236).

## Deferred Features

- **Supplier Aging report** — in the catalog, screen deferred pending aging
  buckets + method (BDD-009).
- **Document `Locked` state** — named by PD-17 but undefined trigger/effect and
  in tension with PD-14; deferred pending BDR-07 (DL-020).
- **`/settings` attachment-limits and backup sections** — shown read-only
  pending BDR-08 / BDR-12.
- **Attachment title/note editing and posted-owner deletion** — pending BDR-08.
- **`Unpost` audit producer** — reserved; awaits the reversal policy (BDR-07).
- **`Login` / `Logout` audit producers** — reserved; await authentication (a
  future multi-user possibility).

## Open Business Decisions

| Decision                                         | Blocks                                   |
| ------------------------------------------------ | ---------------------------------------- |
| Supplier Aging buckets + method                  | Supplier Aging report contents           |
| BDR-07 — void / reversal policy                  | `Locked` state, `Unpost` action          |
| BDR-08 — attachment limits & deletion policy     | Settings section, attachment edit/delete |
| BDR-12 — backup / recovery policy                | Settings backup section, GA backup plan  |
| BDR-16 — over-return / negative-stock final rule | interim block currently in force         |
| BDR-06 — supplier opening balances               | statements/balances treat opening as 0   |
| BDD-001 / BDD-002 verbatim import                | placeholders only in repo                |

## Technical Debt

| ID     | Item                                                                         | Priority |
| ------ | ---------------------------------------------------------------------------- | -------- |
| TD-001 | AttachmentViewer pan on zoom > 1                                             | Low      |
| TD-002 | MoneyInput has no inline invalid message                                     | Low      |
| TD-003 | Service/component test coverage grows per phase                              | Medium   |
| TD-004 | Persistence is browser localStorage, not Supabase                            | **High** |
| TD-005 | Excel export is UTF-8 CSV, not native `.xlsx`                                | Low      |
| TD-006 | Small duplicated helpers (nextNumber / nameMap / todayIso / status literals) | Low      |
| TD-007 | Report-aggregate rounding vs per-line rounding                               | Low      |

## Known Limitations

- **Data durability:** records live in one browser's `localStorage` and
  attachment binaries in IndexedDB — single-device, no server backup, cleared
  with browser data (TD-004). This is the defining constraint for GA.
- **No authentication:** private single-user model (PD-18 approved); device
  access = full access.
- **Excel export** is a BOM-prefixed CSV that opens in Excel, not a styled
  `.xlsx` workbook (TD-005).
- **Version control:** the working tree is not committed; `al-daftar/.git` is
  incomplete (no `objects/`, stale `config.lock`) and git falls through to an
  empty parent repository. A functional repo + initial commit + RC tag are a
  release prerequisite (below).

## Deployment Prerequisites

1. Repair/initialize the `al-daftar` git repository, commit the tree, tag
   `v1.0.0-rc.1`.
2. Clean-checkout verification on Node 22: `npm ci` then `lint`, `typecheck`,
   `test`, `build`, `verify:theme`, `format:check` — all green.
3. Deploy the Next.js build (Vercel per `vercel.json`).
4. Smoke test: every route; one full lifecycle per document type
   (create → post → print); one report export; the audit log.
5. Confirm RTL/Arabic rendering and print-to-PDF on the target browser.

## GA Requirements (to promote `-rc.1` → `1.0.0`)

1. **Provision Supabase and implement repositories** behind the existing
   `get<Module>Repository()` factories; migrate localStorage/IndexedDB data
   once; delete the local adapters (TD-004).
2. **Backup / recovery policy** (BDR-12) decided and enabled (managed DB
   backups + Storage retention; documented RPO/RTO).
3. Migrations paired with down-migrations; rollback rehearsed.
4. (If multi-user is ever promoted) authentication + the `Login`/`Logout`
   audit producers.

## Recommended Next Project

**GA Deployment & Supabase Migration** — see `docs/release/NEXT_PROJECT.md`.

## Verification snapshot (2026-07-05)

`lint` ✓ · `typecheck` ✓ · `test` ✓ (104) · `build` ✓ (32 route entries +
error/not-found boundaries) · `verify:theme` ✓ (31 tokens) · `format:check` ✓.

## Certification

The repository is certified as **Release Candidate v1.0.0-rc.1**. No production
defect was found within the approved scope. The localStorage persistence
(TD-004) and the uncommitted git state are release-hygiene / GA items, not
code defects.

## Addendum — 2026-07-05 (post-certification): Supabase integration landed

GA Requirement 1 is **done** (DL-031): the schema was applied by the owner to
the configured project; both persistence seams now run on Supabase (records +
`attachments` Storage bucket); a one-time idempotent local-data import is
available (`window.aldaftarMigrateLocalData()`); verified live by
`verify:schema` (21 checks) and 4 integration tests through the real adapter.
The "Data durability" known limitation above is thereby resolved.

Still open before GA `1.0.0`:

- **Backup/recovery policy (BDR-12)** — decide and enable managed backups.
- **Access exposure — RESOLVED (DL-032):** single-administrator
  authentication implemented (login page, AuthGate on every route, persistent
  session, Login/Logout audit producers) with authenticated-only RLS
  (`0002_auth_up.sql`). Activation requires two owner steps: apply migration
  0002, then create the one admin account (`npm run admin:create`).
- Git commit + tag hygiene (unchanged from above).

## Addendum — 2026-07-05 (Lead-Architect longevity hardening, DL-034/DL-035)

Re-evaluated the 10-year review under the **single-owner** model and implemented
the reliability/data-safety items; deferred multi-user/scale items with
justification (see `docs/decision-log.md` DL-034/035 and `docs/technical-debt.md`).

- **Backup & disaster recovery (was BDR-12 gap) — mechanics delivered.**
  `npm run backup` (full paginated DB export + attachment binaries →
  `backups/<ts>/` + manifest) and `npm run restore` (idempotent, audit
  insert-only). Full runbook: `docs/operations/BACKUP_AND_RECOVERY.md` (managed
  - local layers, DR procedure, RPO/RTO, routine). `backups/` is git-ignored.
- **Silent data-truncation cliff — closed.** `SupabaseRecordStore.findAll()`
  now pages through the table, so balances/statements/reports and `nextNumber()`
  stay correct past the Supabase 1000-row API cap — no architecture change.
- **Single administrator — now enforced in the database.** Migration
  `0003_single_admin_up.sql` adds a trigger rejecting any second `auth.users`
  insert plus an explicit `revoke … from anon`; single-admin no longer depends
  only on the create-admin script or the dashboard toggle. **Apply order is now
  `0001 → 0002 → 0003`.**
- **`.claude/` git-ignored** — also removes the stray `format:check` warning.

Still owner-operational (not code): choose a Supabase backup **plan/schedule**,
run one **DR rehearsal**, set dashboard "Disable signups" = ON (defense in
depth), and commit + tag the repository.
