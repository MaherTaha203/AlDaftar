-- ============================================================================
-- AlDaftar — Custody vouchers (سند عهدة) — Migration 0005 — UP
--
-- A custody voucher documents items handed to a person as a trust (عهدة) to be
-- returned later. It is NOT a sale, purchase, invoice, or inventory movement:
-- NO money, NO totals, NO accounting effect — only quantities delivered and,
-- over time, quantities returned.
--
-- Same PARITY-FIRST design as 0001 (columns are the TypeScript fields VERBATIM,
-- quoted camelCase; line items live inside the aggregate as jsonb; the per-type
-- official number is enforced by a partial-unique index on "number").
--
--   custody          — the master voucher. Lifecycle Draft → Issued → Cancelled
--                      (stored). The richer presented status — Partially/Fully
--                      Returned, Overdue — is DERIVED at read time from the
--                      return events + "expectedReturnDate"; nothing to store,
--                      no background job.
--   custody_returns  — append-only return EVENTS linked to a voucher. A line's
--                      returned/remaining quantity is computed from these, never
--                      stored on the voucher, so history is permanent (the table
--                      needs no update/delete path).
--
-- Access model matches post-0002: full access for the authenticated
-- administrator only. Apply AFTER 0001–0004.
-- ============================================================================

create table if not exists custody (
  "id"                 text primary key,
  "number"             integer check ("number" > 0),
  "status"             text not null check ("status" in ('draft', 'issued', 'cancelled')),
  "recipient"          text not null,
  "phone"              text not null default '',
  "date"               text not null check ("date" ~ '^\d{4}-\d{2}-\d{2}$'),
  "expectedReturnDate" text check ("expectedReturnDate" ~ '^\d{4}-\d{2}-\d{2}$'),
  "notes"              text not null default '',
  "lines"              jsonb not null default '[]'::jsonb,
  "createdAt"          text not null,
  "updatedAt"          text not null,
  "issuedAt"           text,
  "cancelledAt"        text
);
-- PARTIAL unique: many null drafts allowed, each issued number used once.
create unique index if not exists custody_number_unique
  on custody ("number") where "number" is not null;

create table if not exists custody_returns (
  "id"        text primary key,
  "custodyId" text not null,   -- reference-by-value; integrity enforced in the service
  "date"      text not null check ("date" ~ '^\d{4}-\d{2}-\d{2}$'),
  "notes"     text not null default '',
  "lines"     jsonb not null default '[]'::jsonb,   -- { custodyLineId, quantity }[]
  "createdAt" text not null
);
create index if not exists custody_returns_custody_idx on custody_returns ("custodyId");

-- ── Row Level Security (authenticated administrator only, per 0002) ──────────

alter table custody         enable row level security;
alter table custody_returns enable row level security;

create policy "admin full access" on custody
  for all to authenticated using (true) with check (true);
create policy "admin full access" on custody_returns
  for all to authenticated using (true) with check (true);
