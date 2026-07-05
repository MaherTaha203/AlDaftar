# Next Project — GA Deployment & Supabase Migration

> **Documentation only.** This describes the next engineering project; it is
> **not** implemented and adds no roadmap features. It exists so the path from
> Release Candidate (v1.0.0-rc.1) to General Availability (v1.0.0) is defined.

## Project Name

GA Deployment & Supabase Migration.

## Objectives

- Replace the interim browser persistence (TD-004) with durable, backed-up
  server persistence on Supabase, **without changing any business behavior**.
- Achieve data durability, backup/recovery, and a repeatable deployment so the
  app can hold real business data as GA v1.0.0.

## Scope

**In scope**

- Supabase project provisioning (database + Storage) and environment wiring
  through the existing `lib/config/environment.ts` single source.
- Supabase implementations of the record repositories behind the existing
  `get<Module>Repository()` factories, and of the file store behind
  `getFileStore()` — the two documented swap seams. **No call site changes.**
- SQL schema + migrations mirroring the current entity shapes (suppliers,
  products, categories, units, currencies, purchases, purchase-returns,
  payments, attachments metadata, audit entries, settings).
- One-time migration of existing localStorage/IndexedDB data.
- Backup/recovery policy (BDR-12) enablement and documentation.
- Deployment pipeline (Vercel) with the CI gates as release checks.

**Out of scope**

- Any new business feature, report, or module.
- Authentication / multi-user (a separate future decision, PD-18 §4).
- Resolving the deferred business decisions (Supplier Aging, BDR-06/07/08/16) —
  those remain owner-gated and independent of this project.

## Deliverables

1. Supabase schema + versioned migrations (up **and** down).
2. `SupabaseRecordStore` / Supabase file-store adapters behind the factories.
3. A data-migration script (localStorage/IndexedDB → Supabase) run once.
4. Backup/recovery runbook (RPO/RTO), aligned with the BDR-12 decision.
5. Deployment + rollback runbooks; CI wired as the release gate.
6. Green verification on a clean checkout; RC → GA tag `v1.0.0`.

## Migration Strategy

1. **Parity first:** stand up the schema; implement adapters; keep the local
   adapter available behind a flag so behavior can be compared 1:1.
2. **Verify equivalence:** run the existing suite + manual lifecycle smoke
   tests against Supabase; confirm balances, inventory, numbering, and audit
   entries match the local-store results.
3. **One-time data import:** export current browser data, transform to rows,
   import transactionally; verify counts and spot-check documents.
4. **Cutover:** switch the factories to Supabase; remove the local adapters and
   TD-004; retag GA.
5. Numbering (BDR-01) must stay continuous/never-reused — enforce with a
   transactional next-number in the DB layer.

## Rollback Strategy

- **Code:** redeploy the previous tag (stateless build; instant via Vercel
  promote-previous).
- **Schema:** every forward migration ships with a tested down migration;
  rehearse rollback in a branch/preview project before cutover.
- **Data:** keep the pre-migration browser export and a Supabase backup
  snapshot; a failed cutover restores from the snapshot and reverts the
  factory switch.
- **Guardrail:** do not delete the local adapter until a successful cutover +
  one backup cycle is confirmed.

## Risks

| Risk                                      | Mitigation                                                                                    |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| Data loss during one-time import          | Dry-run import into a preview project; verify counts; keep the source export until confirmed. |
| Numbering gaps/reuse under concurrency    | Transactional next-number in the DB; single-user makes contention negligible.                 |
| Rounding/behavior drift between adapters  | Parity phase compares Supabase vs local outputs before cutover.                               |
| RLS/permissions misconfig exposing data   | Start locked-down; single-owner access; review advisors before GA.                            |
| Migration coupling to a business decision | This project stays behavior-neutral; deferred BDRs are handled separately.                    |

## Estimated Phases

1. **Provision & wire** — Supabase project, env, connectivity smoke.
2. **Schema & migrations** — tables + up/down migrations mirroring entities.
3. **Adapters** — Supabase record + file stores behind the existing factories.
4. **Parity verification** — suite + lifecycle smoke; Supabase vs local.
5. **Data import** — one-time migration + verification.
6. **Backup/recovery** — enable + document (BDR-12).
7. **Cutover & GA** — switch factories, remove local adapter/TD-004, tag
   `v1.0.0`, deployment + rollback runbooks.
