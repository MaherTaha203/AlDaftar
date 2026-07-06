-- ============================================================================
-- AlDaftar — initial schema (GA / Supabase Migration, phase: Database Schema)
-- Migration 0001 — UP
--
-- Design: PARITY-FIRST. Columns are the TypeScript record fields VERBATIM
-- (quoted camelCase), so the SupabaseRecordStore inserts/reads rows with no
-- field-mapping layer that could drift (see lib/modules/shared/
-- supabase-record-store.ts). String parity choices, all deliberate:
--   * id            → text (crypto.randomUUID() strings; byte-exact round-trip)
--   * timestamps    → text ISO-8601 (the app writes new Date().toISOString()
--                     and compares strings; timestamptz would reformat)
--   * document date → text 'yyyy-mm-dd' + format CHECK (storage form, DL-028)
--   * lines         → jsonb (line items live INSIDE their document aggregate,
--                     business-architecture R3; the app reads whole documents)
--   * amounts       → numeric(14,2) (BDR-02: ILS, 2dp; app rounds half-up)
-- Numbering (BDR-01): per-type sequence, never reused → partial UNIQUE index
-- on "number" where posted.
--
-- ACCESS MODEL (PD-18, approved): private single-user, full access, NO auth
-- phase exists. RLS is ENABLED with anon read/write policies to match that
-- model. ⚠ The anon key ships in the browser bundle: anyone holding the
-- project URL + anon key can access the data. Before real business data
-- enters this database, either add authentication or restrict policies.
-- Recorded as a GA risk in docs/release/RC-1.md.
-- ============================================================================

-- ── Master data ─────────────────────────────────────────────────────────────

create table if not exists suppliers (
  "id"           text primary key,
  "name"         text not null,
  "status"       text not null check ("status" in ('active', 'archived')),
  "phone"        text not null default '',
  "address"      text not null default '',
  "taxReference" text not null default '',
  "notes"        text not null default '',
  "createdAt"    text not null,
  "updatedAt"    text not null
);

create table if not exists categories (
  "id"        text primary key,
  "name"      text not null,
  "status"    text not null check ("status" in ('active', 'archived')),
  "notes"     text not null default '',
  "createdAt" text not null,
  "updatedAt" text not null
);

create table if not exists units (
  "id"        text primary key,
  "name"      text not null,
  "status"    text not null check ("status" in ('active', 'archived')),
  "notes"     text not null default '',
  "createdAt" text not null,
  "updatedAt" text not null
);

create table if not exists currencies (
  "id"        text primary key,
  "name"      text not null,
  "status"    text not null check ("status" in ('active', 'archived')),
  "code"      text not null default '',
  "createdAt" text not null,
  "updatedAt" text not null
);

create table if not exists products (
  "id"         text primary key,
  "name"       text not null,
  "status"     text not null check ("status" in ('active', 'archived')),
  "code"       text not null default '',
  "categoryId" text not null default '',
  "unitId"     text not null,
  "notes"      text not null default '',
  "createdAt"  text not null,
  "updatedAt"  text not null
);

-- ── Documents (Draft → Posted; posted immutable at the application layer) ───

create table if not exists purchases (
  "id"                     text primary key,
  "number"                 integer check ("number" > 0),
  "status"                 text not null check ("status" in ('draft', 'posted')),
  "supplierId"             text not null,
  "date"                   text not null check ("date" ~ '^\d{4}-\d{2}-\d{2}$'),
  "supplierInvoiceRef"     text not null default '',
  "withoutSupplierInvoice" boolean not null default false,
  "notes"                  text not null default '',
  "lines"                  jsonb not null default '[]'::jsonb,
  "createdAt"              text not null,
  "updatedAt"              text not null,
  "postedAt"               text
);
create unique index if not exists purchases_number_unique
  on purchases ("number") where "number" is not null;

create table if not exists purchase_returns (
  "id"         text primary key,
  "number"     integer check ("number" > 0),
  "status"     text not null check ("status" in ('draft', 'posted')),
  "purchaseId" text not null,
  "supplierId" text not null,
  "date"       text not null check ("date" ~ '^\d{4}-\d{2}-\d{2}$'),
  "notes"      text not null default '',
  "lines"      jsonb not null default '[]'::jsonb,
  "createdAt"  text not null,
  "updatedAt"  text not null,
  "postedAt"   text
);
create unique index if not exists purchase_returns_number_unique
  on purchase_returns ("number") where "number" is not null;

create table if not exists payments (
  "id"        text primary key,
  "number"    integer check ("number" > 0),
  "status"    text not null check ("status" in ('draft', 'posted')),
  "supplierId" text not null,
  "date"      text not null check ("date" ~ '^\d{4}-\d{2}-\d{2}$'),
  "amount"    numeric(14,2) not null default 0 check ("amount" >= 0),
  "discount"  numeric(14,2) not null default 0 check ("discount" >= 0),
  "method"    text not null default '',
  "reference" text not null default '',
  "notes"     text not null default '',
  "createdAt" text not null,
  "updatedAt" text not null,
  "postedAt"  text
);
create unique index if not exists payments_number_unique
  on payments ("number") where "number" is not null;

-- ── Attachments metadata (binaries live in Storage bucket 'attachments') ────

create table if not exists attachments (
  "id"          text primary key,
  "ownerType"   text not null,
  "ownerId"     text not null,
  "title"       text not null default '',
  "contentType" text not null default '',
  "size"        integer not null default 0 check ("size" >= 0),
  "storageKey"  text not null,
  "createdAt"   text not null
);
create index if not exists attachments_owner_idx on attachments ("ownerType", "ownerId");

-- ── Audit trail (BDD-010: immutable, append-only) ───────────────────────────
-- Enforced in depth: no UPDATE/DELETE policy exists (RLS blocks them for anon),
-- so entries cannot be changed or erased through the application key.

create table if not exists audit (
  "id"          text primary key,
  "timestamp"   text not null,
  "user"        text not null default '',
  "device"      text not null default '',
  "action"      text not null check (
    "action" in ('create', 'update', 'delete', 'post', 'unpost', 'login', 'logout')
  ),
  "entityType"  text not null,
  "entityId"    text not null,
  "entityLabel" text not null default '',
  "summary"     text not null default '',
  "before"      text,
  "after"       text
);
create index if not exists audit_timestamp_idx on audit ("timestamp" desc);

-- ── Settings (single fixed-id row: company profile) ─────────────────────────

create table if not exists settings (
  "id"           text primary key,
  "companyName"  text not null default '',
  "address"      text not null default '',
  "phone"        text not null default '',
  "taxReference" text not null default '',
  "logoDataUrl"  text not null default ''
);

-- ── Storage bucket for attachment binaries ──────────────────────────────────

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- ── Row Level Security (single-owner, no-auth model — see header warning) ───

alter table suppliers        enable row level security;
alter table categories       enable row level security;
alter table units            enable row level security;
alter table currencies       enable row level security;
alter table products         enable row level security;
alter table purchases        enable row level security;
alter table purchase_returns enable row level security;
alter table payments         enable row level security;
alter table attachments      enable row level security;
alter table audit            enable row level security;
alter table settings         enable row level security;

-- Full CRUD for the app key on business tables (matches PD-18 single-owner).
do $$
declare t text;
begin
  foreach t in array array[
    'suppliers','categories','units','currencies','products',
    'purchases','purchase_returns','payments','attachments','settings'
  ] loop
    execute format(
      'create policy "app full access" on %I for all to anon using (true) with check (true)', t
    );
  end loop;
end $$;

-- Audit: append-only through the app key — SELECT + INSERT, never UPDATE/DELETE.
create policy "app read"   on audit for select to anon using (true);
create policy "app append" on audit for insert to anon with check (true);

-- Storage: app key may read/write the attachments bucket.
create policy "app attachments read"
  on storage.objects for select to anon using (bucket_id = 'attachments');
create policy "app attachments write"
  on storage.objects for insert to anon with check (bucket_id = 'attachments');
create policy "app attachments delete"
  on storage.objects for delete to anon using (bucket_id = 'attachments');
