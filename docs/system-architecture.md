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
views** render through `PrintLayout`. Persistence currently uses the interim
local-store adapter
behind repository seams (TD-004); the Supabase implementation replaces it at
one factory when a project is available.

## 2. Technology stack (verified from `package.json`)

- Next.js `^15.1.0` (App Router) · React `^19` · TypeScript `^5.7` (strict)
- Tailwind CSS `^4` (CSS-first `@theme` bound to `lib/theme` tokens, DL-006/DL-011)
- `@supabase/supabase-js` `^2` (used by `lib/infrastructure` ConnectionFactory; dormant until a project is connected)
- ESLint 9 flat config + Prettier; Node 22 (pinned)

## 3. Directory responsibilities

| Path                                       | Responsibility                                                                                                                                                                                                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/`                                     | Root RTL document + `(app)` route group (shell) + module routes; plus Arabic RTL production boundaries: `error.tsx`, `global-error.tsx`, `not-found.tsx`                                                                                                                        |
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
LocalRecordStore (browser localStorage; interim, TD-004). Balances,
inventory, and reports are calculated from posted documents, never stored:
`lib/modules/reporting` loads a read snapshot and pure aggregations project it
into report/dashboard data (writes nothing). The `lib/modules/audit` trail is
written from module write paths (create/update/delete/post) as an immutable
append-only record, separate from operational logging (R7). No API routes and
no server data access yet — introduced when Supabase connects behind the same
seams.

## 8. Build, quality, and CI

Scripts: `dev`, `build`, `start`, `lint`, `lint:fix`, `typecheck`, `test`,
`test:watch`, `format`, `format:check`, `verify:theme`. CI runs format → lint
→ typecheck → **test** → theme guard → build. Unit tests use Vitest (DL-019)
over the pure/technical logic layer. Security/Release workflows unchanged.

## 9. Deployment

Not configured beyond `vercel.json` (framework declaration); deployment is
a later phase (Production Readiness).
