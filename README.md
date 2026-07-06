# Al Daftar (الدفتر)

## Project

Al Daftar is a private financial management system built for a single company and a single user.

## Purpose

Al Daftar is a supplier financial archive and purchasing management system. It is intentionally narrow in scope. It is not an ERP, inventory, warehouse, sales, accounting, or CRM system. Its purpose is to archive supplier financial records and manage purchasing — nothing more.

## Technology

- Next.js (App Router)
- React
- TypeScript (strict mode)
- Tailwind CSS
- Supabase
- PostgreSQL
- Vercel
- GitHub

## Repository Structure

```
app/         Next.js App Router entry (root RTL shell, /login, module routes)
components/  UI layer: ui / layout / app / framework / modules
database/    SQL schema migrations (0001_init up/down — Supabase)
docs/        Architecture and specification documents
lib/         Core, application, domain, infrastructure, and business modules
public/      Static assets
scripts/     Maintenance and tooling scripts (e.g. verify-theme)
services/    Reserved (the service layer lives in lib/modules; awaiting removal or use)
styles/      Global stylesheet (Tailwind initialization, reset, RTL)
tests/       Vitest unit suite for the pure/technical logic layer (npm test)
```

> The authoritative, continuously synchronized description of the codebase as
> it actually exists is `docs/system-architecture.md`. This section is a brief
> orientation only.

## Architecture Philosophy

The architecture is decided in advance and is treated as fixed. Every file and directory must justify its existence and carry a single, clear responsibility. Features are added only when explicitly specified, in their designated phase. Implementation may adapt to constraints; the architecture does not. Business modules (Suppliers, Categories, Units, Currencies, Products, Purchases, Purchase Returns, Payments, Attachments) plus the cross-cutting Reporting, Audit, Settings, and Dashboard surfaces and document print views are implemented behind repository seams; persistence runs on Supabase (records + attachment Storage, DL-031), registered once at the composition root, and access requires the single administrator's session (Supabase Auth + authenticated-only RLS, DL-032). The application is certified as Release Candidate **v1.0.0-rc.1** (see `docs/release/RC-1.md`).
