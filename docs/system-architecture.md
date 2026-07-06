# System Architecture

> Scope: this document describes the repository **as it exists today**
> (synchronized at the Release Candidate audit, 2026-07-05). Only verified
> facts about the current codebase are recorded here.

## 1. Overview

Al Daftar is a private, single-company, single-user supplier financial
archive and purchasing management system (Arabic, RTL). The engineering
foundation, application shell, Reference Framework, and the business modules
are implemented: Suppliers, Categories, Units, Currencies, Products, Purchases,
Purchase Returns, Payments (draft → posted lifecycle per the frozen
architectures), Attachments, plus the cross-cutting **Reporting** read model,
the **Audit** trail, **Settings**, and the **Dashboard**; document **print
views** render through `PrintLayout`. Persistence runs on **Supabase**
(DL-031): records through PostgREST tables, attachment binaries through the
`attachments` Storage bucket — registered once at the composition root; the
local adapters remain only as the no-provider default used by tests and as
the source of the one-time local-data import. Access requires the **single
administrator's session** (DL-032): `/login` (Supabase Auth, email+password,
persistent "remember me" session) is the only unauthenticated surface;
`AuthGate` protects every app route and RLS enforces authenticated-only data
access at the database.

## 2. Technology stack (verified from `package.json`)

- Next.js `^15.1.0` (App Router) · React `^19` · TypeScript `^5.7` (strict)
- Tailwind CSS `^4` (CSS-first `@theme` bound to `lib/theme` tokens, DL-006/DL-011)
- `@supabase/supabase-js` `^2` (used by `lib/infrastructure` ConnectionFactory; dormant until a project is connected)
- ESLint 9 flat config + Prettier; Node 22 (pinned)

## 3. Directory responsibilities

| Path                                       | Responsibility                                                                                                                                                                                                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/`                                     | Root RTL document + `/login` (the only unauthenticated surface) + `(app)` route group (AuthGate → shell) + module routes; plus Arabic RTL production boundaries: `error.tsx`, `global-error.tsx`, `not-found.tsx`                                                               |
| `components/ui`                            | Business-blind primitives (frozen Sprint 1 + master components). Lib-free (DL-012)                                                                                                                                                                                              |
| `components/layout`                        | Shell chrome: AppShell, Sidebar, Header, Breadcrumb, Toolbar, PageContainer. Lib-free                                                                                                                                                                                           |
| `components/app`                           | App composition: providers, navigation config, route/breadcrumb utils, PageLayout                                                                                                                                                                                               |
| `components/framework`                     | Business Framework: error catalog, useOperation, ListPage/FormPage, EntityPicker (sole lib/core bridge, DL-012)                                                                                                                                                                 |
| `components/modules`                       | Module screens + the Reference screen (`shared/master-data-screen`) + reports (catalog + data-driven view + CSV export), audit-log, settings, dashboard, and document print views (`shared/company-header`)                                                                     |
| `lib/core`                                 | Result, errors, logging, guards, utils, technical types (frozen)                                                                                                                                                                                                                |
| `lib/application`                          | `ApplicationService` (ADR-0001)                                                                                                                                                                                                                                                 |
| `lib/infrastructure`                       | Config, database/storage contracts, ConnectionFactory, telemetry (awaiting Supabase phases)                                                                                                                                                                                     |
| `lib/domain`                               | Generic DDD bases (Entity, ValueObject, Identifier, rules) for later domain hardening                                                                                                                                                                                           |
| `lib/modules`                              | Business modules: shared kit (RepositoryFactory, local/file store, master-data, money, amount-in-words, dates) + suppliers/categories/units/currencies/products/purchases/purchase-returns/payments/attachments + cross-cutting reporting (read model), audit (trail), settings |
| `lib/config`, `lib/theme`, `lib/constants` | Env single-source (DL-003), canonical design tokens, technical constants                                                                                                                                                                                                        |
| `docs/`                                    | Authoritative documents: business architecture, BDDs, system design 01–08, purchase/payments architecture (frozen), ADRs, decision log, technical debt, development plan, and `release/` (RC-1, next project)                                                                   |
| `scripts/`                                 | `verify-theme.mjs` drift guard (DL-011, in CI)                                                                                                                                                                                                                                  |

## 4. Layering (enforced; DL-012)

`app` → `components/modules` → `components/{framework,app,layout,ui}` and
`lib/modules` → `lib/{application,core}`. `components/ui`+`layout` import no
lib code; `components/framework` imports only `lib/core`; modules obtain
persistence exclusively via `lib/modules/shared/repository-factory.ts` (the
single Supabase swap seam). Grep-verified at the Stabilization Gate.

## 5. Configuration boundary

Unchanged: strict TS (`noUnusedLocals/Parameters`), Prettier enforced,
ESLint CLI flat config, `.env.example` documents the (currently unused)
Supabase variables; `lib/config/environment.ts` remains the env single
source (DL-003). The former `lib/supabase.ts` module-level client was
removed at the Stabilization Gate — superseded by the lazy
`ConnectionFactory` (its documented replacement).

## 6. Styling / design foundation

Tailwind v4 `@theme` in `styles/globals.css` projects `lib/theme` tokens;
the binding is mechanically guarded by `npm run verify:theme` in CI (DL-011).
Document direction RTL throughout.

## 7. Data flow

Client module screens → `useOperation` → module `ApplicationService`
(Result-based, logged) → repository contract → RepositoryFactory →
**SupabaseRecordStore** (PostgREST; quoted-camelCase columns = record fields,
jsonb `lines`) — registered by `components/app/persistence-bootstrap.ts` at
the composition root (DL-031); with no registration (tests) the factory falls
back to the LocalRecordStore. Attachment binaries: `getFileStore()` →
`SupabaseFileStore` → Storage bucket `attachments`. Every request carries the
signed-in administrator's JWT (DL-032); RLS (migration 0002): the
authenticated role has CRUD on business tables and INSERT+SELECT only on
`audit` (append-only in depth); the bare anon key can access nothing. Balances, inventory, and reports are calculated from posted documents,
never stored: `lib/modules/reporting` loads a read snapshot and pure
aggregations project it into report/dashboard data (writes nothing). The
`lib/modules/audit` trail is written from module write paths as an immutable
append-only record, separate from operational logging (R7). Schema lives in
`database/migrations/0001_init_{up,down}.sql`; no bespoke API routes — the
client talks to Supabase directly.

## 8. Build, quality, and CI

Scripts: `dev`, `build`, `start`, `lint`, `lint:fix`, `typecheck`, `test`,
`test:watch`, `format`, `format:check`, `verify:theme`, `verify:supabase`
(connectivity/auth), `verify:schema` (live tables/RLS/storage checks). CI runs
format → lint → typecheck → **test** → theme guard → build; the build step
uses placeholder Supabase values (presence validation only — no network at
build). Vitest (DL-019) covers the pure/technical layer plus a live
integration suite for the Supabase adapter that self-skips when no
`.env.local` is present. Security/Release workflows unchanged.

## 9. Deployment

Not configured beyond `vercel.json` (framework declaration); deployment is
a later phase (Production Readiness).
