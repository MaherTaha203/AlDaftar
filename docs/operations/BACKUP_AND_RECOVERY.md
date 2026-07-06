# Backup & Disaster Recovery — Al Daftar

> Operational runbook for the **single owner**. Al Daftar is your company's
> financial archive; this document is how you never lose it. Read it once, run
> a backup + a test restore once, and you are covered for the next decade.

## 1. What has to survive

| Asset                                                                                                      | Where it lives                                 | Covered by                         |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------- |
| All records (suppliers, products, purchases, returns, payments, attachments metadata, **audit**, settings) | Supabase Postgres                              | `npm run backup` + managed backups |
| Attachment binaries (invoice/receipt scans)                                                                | Supabase Storage bucket `attachments`          | `npm run backup`                   |
| The database schema                                                                                        | `database/migrations/0001…0003` (in this repo) | Git                                |
| The application code                                                                                       | this repository                                | Git (commit + tag — see §7)        |

## 2. Two layers of backup (use both)

**Layer 1 — Managed (Supabase, automatic).** Enable database backups on the
Supabase project (Project → Database → Backups). Paid plans include daily
backups and Point-in-Time Recovery (PITR). **The free plan has no backups** —
if you keep real business data here, you must either upgrade or rely entirely
on Layer 2. Record your plan's retention as your **RPO** (how much data you can
lose): daily managed backup ⇒ up to 24h; PITR ⇒ minutes.

**Layer 2 — Local export (this repo, manual/scheduled).** A complete,
portable copy you control:

```bash
npm run backup
```

Writes `backups/<timestamp>/` containing one `<table>.json` per table, every
attachment binary under `storage/`, and a `manifest.json` of counts. Requires
`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
The `backups/` folder is git-ignored — **it contains full financial data; keep
it encrypted and off-site** (external drive + cloud). Run it on a schedule
(OS cron / Task Scheduler) — weekly at minimum, daily if you enter documents
most days.

## 3. Export / Import (portability)

The Layer-2 backup **is** the export: plain JSON + files, no proprietary
format, readable in 10 years by anything. To import into any Supabase project
whose schema is migrated:

```bash
npm run restore -- backups/<timestamp>
```

Idempotent — rows upsert by `id`, so re-running never duplicates; the `audit`
table is insert-only, preserving its append-only guarantee. Use this to move
projects, seed a staging copy, or recover (§4).

## 4. Disaster recovery procedure

If the Supabase project is deleted, corrupted, or lost:

1. **Create a new Supabase project.**
2. **Apply the schema in order** (Supabase SQL editor):
   `0001_init_up.sql` → `0002_auth_up.sql` → `0003_single_admin_up.sql`.
   Then `npm run verify:schema` to confirm (21 checks).
3. **Point the app/scripts at the new project** — update `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
4. **Recreate the admin account:** `npm run admin:create <email> <password>`.
5. **Restore the latest backup:** `npm run restore -- backups/<latest>`.
6. **Verify counts** against the backup's `manifest.json`, sign in, open the
   Audit Log and a Supplier Statement, print one document.

**RTO** (time to be running again) with a fresh project + a recent local
backup: well under an hour. **Rehearse it once now** against a throwaway
project so step 5 is not the first time you run it.

## 5. Security posture that protects the data (verify these)

- **Single administrator, enforced in the database.** `0003_single_admin_up.sql`
  installs a trigger that rejects any second `auth.users` insert. Even if the
  Supabase "Disable signups" toggle is ever wrong, a second account cannot be
  created. Still, set **Authentication → Providers → "Disable signups" = ON**
  in the dashboard as defense in depth.
- **No anonymous access.** After `0002` (and the explicit `revoke` in `0003`),
  the public anon key alone can read/write nothing; every request needs the
  administrator's signed-in JWT. RLS is `authenticated`-only.
- **Audit is append-only at the database.** The authenticated role has
  SELECT + INSERT on `audit` and no UPDATE/DELETE policy — entries cannot be
  altered or erased through the app.
- **Keep the service-role key secret.** It bypasses RLS (needed for backup /
  restore / admin creation). Never ship it to the browser, never commit it.
- **Account recovery:** there is no in-app password reset (single-admin, by
  design). If you lose the password, reset it from the Supabase dashboard
  (Authentication → Users). Keep the project login recoverable.

## 6. What is intentionally NOT built (accepted for a single owner)

- No in-app backup UI — the CLI scripts are simpler and scriptable.
- No cross-table transactions / DB numbering sequence — a single owner cannot
  race themselves; the partial-unique index on `number` already prevents
  duplicate document numbers, and `findAll()` now pages through the full table
  so `nextNumber()` always sees the true maximum.

## 7. Code is data too

Commit this repository and tag releases (`git init` if needed, then commit +
`v1.0.0-rc.1`). The schema and scripts that make recovery possible live here;
an uncommitted working tree is itself a disaster-recovery gap.

## 8. Minimum routine (put on the calendar)

- **Weekly:** `npm run backup`; copy `backups/<latest>` off-site (encrypted).
- **Quarterly:** a test `npm run restore` into a scratch project; confirm counts.
- **On plan change:** re-check that Supabase managed backups are still enabled.
