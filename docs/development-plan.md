# Development Plan — Roadmap & Status

Factual record of what is delivered, the current validation state, and what
remains. This document synchronizes the roadmap with the repository; it invents
no business behavior. Where a remaining item depends on an unanswered business
decision, that decision is named per the neutrality rule (DL-010).

## Delivered and frozen

Foundation (stack, config, CI, theme single-source, UI/layout/framework layers)
and the following are live:

| Area             | Route(s) / surface                                        | Phase   |
| ---------------- | --------------------------------------------------------- | ------- |
| Suppliers        | `/suppliers` (+ new / [id] / edit)                        | —       |
| Products         | `/products`                                               | —       |
| Categories       | `/categories`                                             | —       |
| Units            | `/units`                                                  | —       |
| Currencies       | `/currencies`                                             | —       |
| Purchases        | `/purchases` (+ new / [id] / edit / **[id]/print**)       | P21     |
| Purchase returns | `/purchase-returns` (+ new / [id] / edit / **print**)     | P21     |
| Payments         | `/payments` (+ new / [id] / edit / **[id]/print**)        | P14/P21 |
| Attachments      | `/attachments`                                            | P15     |
| **Reports**      | `/reports` + `/reports/[report]` (14 reports + CSV/print) | **P18** |
| **Settings**     | `/settings` (company profile + read-only constants)       | **P19** |
| **Audit log**    | `/audit-log` (read-only immutable trail)                  | **P20** |
| **Dashboard**    | `/` (calculated tiles + recent documents, R-01)           | **P22** |

Supporting infrastructure delivered this cycle:

- **Reporting read model** (`lib/modules/reporting`) — business-blind
  aggregations over posted documents (supplier statement/balances, purchases &
  payments breakdowns, product movement, attachments, audit) with unit tests.
- **Audit trail** (`lib/modules/audit`) — immutable append-only record; wired
  into master-data create/update/archive, document create/update/post, and
  attachment upload/delete (BDD-010 / DL-021).
- **Settings** (`lib/modules/settings`) — company profile for print headers.
- **Formatting** — `formatDate`/`formatDateTime` (DD/MM/YYYY, BDR-18),
  `amountInWords` (Arabic, BDR-19), Latin digits confirmed (BDR-17).
- **Print** — document print views through `PrintLayout`; app-shell chrome is
  `screen-only` so only the sheet prints.

## Current validation state (verified 2026-07-05, Release Candidate audit)

- `npm run lint` — pass
- `npm run typecheck` — pass
- `npm run test` — pass (104 tests, Vitest)
- `npm run build` — pass (32 routes + error/not-found boundaries)
- `npm run verify:theme` — pass (31 tokens in sync)
- `npm run format:check` — pass (excluding the git-ignored local settings file)

Production hardening added at RC (DL-030): Arabic RTL error boundaries
(`app/error.tsx`, `app/global-error.tsx`), a 404 page (`app/not-found.tsx`),
strict ISO date validation before posting, finite-number guards, and CSV
formula-injection neutralization for exports. Tracked debt: TD-006 (small
duplicated helpers), TD-007 (report-aggregate rounding) — both Low.

## Remaining — requires an owner business decision

No further **business-independent** roadmap work remains. The following are the
only open items, each gated on an owner decision (engineering will not invent
them, DL-010):

| Item                                                        | Blocking decision                                                                                                                 |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Supplier Aging** report contents                          | Aging buckets + aging method (not implied by the running-balance model DL-016). Listed in the catalog, screen deferred (BDD-009). |
| Document **Locked** state                                   | PD-17 named it but left its trigger/effect undefined and it conflicts with PD-14; deferred pending BDR-07 (DL-020).               |
| `/settings` attachments-limits + backup sections            | **BDR-08**, **BDR-12** (shown read-only as pending).                                                                              |
| Attachment title/note editing; posted-owner deletion        | **BDR-08**.                                                                                                                       |
| Over-return final rule (interim block in place)             | **BDR-16**.                                                                                                                       |
| Void / reversal (enables the `Unpost` audit action)         | **BDR-07**.                                                                                                                       |
| Supplier opening balance (statement/balances treat it as 0) | **BDR-06**.                                                                                                                       |
| `Login`/`Logout` audit producers                            | a future authentication phase (multi-user is a §4 future possibility).                                                            |

Also outstanding, unrelated to a phase: **BDD-001 / BDD-002** are approved
externally; only placeholders exist in the repository
(`docs/business-decisions/BDD-00{1,2}-PLACEHOLDER.md`) pending verbatim import,
and **Supabase provisioning** (TD-004) is an owner resource action.

## Conclusion

The approved decision package (BDR-10, BDR-11, PD-08/09/14/16/17, BDR-17/18/19)
has been propagated to the business documents and implemented: Reports,
Settings, Audit Log, document Printing, and the Dashboard are delivered and
verified. What remains is decision-gated, not engineering-gated.
