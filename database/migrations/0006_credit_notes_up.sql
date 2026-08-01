-- ============================================================================
-- AlDaftar — Supplier Credit Notes (إشعار دائن للمورد) — Migration 0006 — UP
--
-- The first correction document of BDD-011 (resolves BDR-07): a VALUE-ONLY,
-- DECREASE-ONLY correction against exactly one posted purchase. Strict
-- boundary rule: goods physically moved back → purchase_returns; only
-- financial value changes → supplier_credit_notes. The two never overlap.
--
-- Same PARITY-FIRST design as 0001/0005 (columns are the TypeScript fields
-- VERBATIM, quoted camelCase; the optional line attributions live inside the
-- aggregate as jsonb; the per-type official number is enforced by a
-- partial-unique index on "number"). Lifecycle Draft → Posted; posted notes
-- are immutable (enforced in the service, like every document). The shared
-- no-negative cap (purchase − posted returns − posted prior notes ≥ 0) is a
-- posting rule in the service — reference-by-value like every link.
--
-- Access model matches post-0002: authenticated administrator only.
-- Apply AFTER 0001–0005. Run `npm run verify:schema` after applying.
-- ============================================================================

create table if not exists supplier_credit_notes (
  "id"           text primary key,
  "number"       integer check ("number" > 0),
  "status"       text not null check ("status" in ('draft', 'posted')),
  "purchaseId"   text not null,   -- reference-by-value; integrity enforced in the service
  "supplierId"   text not null,   -- copied from the purchase at draft creation
  "date"         text not null check ("date" ~ '^\d{4}-\d{2}-\d{2}$'),
  "amount"       numeric(14,2) not null check ("amount" > 0),
  "reasonType"   text not null check (
    "reasonType" in ('wrong-price', 'undelivered-line', 'supplier-credit', 'duplicate', 'other')
  ),
  "reasonNote"   text not null default '',
  "attributions" jsonb not null default '[]'::jsonb,  -- { id, purchaseLineId, amount, note }[]
  "notes"        text not null default '',
  "createdAt"    text not null,
  "updatedAt"    text not null,
  "postedAt"     text
);

-- PARTIAL unique: many null drafts allowed, each posted number used once.
create unique index if not exists supplier_credit_notes_number_unique
  on supplier_credit_notes ("number") where "number" is not null;

create index if not exists supplier_credit_notes_purchase_idx
  on supplier_credit_notes ("purchaseId");

-- ── Row Level Security (authenticated administrator only, per 0002) ──────────

alter table supplier_credit_notes enable row level security;

create policy "admin full access" on supplier_credit_notes
  for all to authenticated using (true) with check (true);
