-- ============================================================================
-- AlDaftar — Payment Refunds (سند استرداد دفعة) — Migration 0007 — UP
--
-- The second correction document of BDD-011 (resolves BDR-07): money
-- returned by the supplier against exactly one posted payment — the payment
-- itself is never edited. The refund mirrors the payment's TWO credit
-- components so a wrong payment can be fully reversed without leaving a
-- phantom credit: "amount" (cash refunded) and "discountReversal" (cancels
-- payment-time discount); at least one is positive. The per-component caps
-- (cash ≤ payment cash − prior posted refunds; reversal ≤ payment discount −
-- prior posted reversals) are posting rules in the service —
-- reference-by-value like every link.
--
-- Same PARITY-FIRST design as 0001/0005/0006 (columns are the TypeScript
-- fields VERBATIM, quoted camelCase; the per-type official number is
-- enforced by a partial-unique index on "number"). Lifecycle Draft → Posted.
--
-- Access model matches post-0002: authenticated administrator only.
-- Apply AFTER 0001–0006. Run `npm run verify:schema` after applying.
-- ============================================================================

create table if not exists payment_refunds (
  "id"               text primary key,
  "number"           integer check ("number" > 0),
  "status"           text not null check ("status" in ('draft', 'posted')),
  "paymentId"        text not null,   -- reference-by-value; integrity enforced in the service
  "supplierId"       text not null,   -- copied from the payment at draft creation
  "date"             text not null check ("date" ~ '^\d{4}-\d{2}-\d{2}$'),
  "amount"           numeric(14,2) not null check ("amount" >= 0),
  "discountReversal" numeric(14,2) not null default 0 check ("discountReversal" >= 0),
  "reasonType"       text not null check (
    "reasonType" in (
      'money-returned', 'wrong-supplier', 'overpaid', 'duplicate', 'wrong-discount', 'other'
    )
  ),
  "reasonNote"       text not null default '',
  "method"           text not null default '',
  "reference"        text not null default '',
  "notes"            text not null default '',
  "createdAt"        text not null,
  "updatedAt"        text not null,
  "postedAt"         text,
  -- At least one component returns value (service rule, mirrored in depth).
  check ("amount" > 0 or "discountReversal" > 0)
);

-- PARTIAL unique: many null drafts allowed, each posted number used once.
create unique index if not exists payment_refunds_number_unique
  on payment_refunds ("number") where "number" is not null;

create index if not exists payment_refunds_payment_idx
  on payment_refunds ("paymentId");

-- ── Row Level Security (authenticated administrator only, per 0002) ──────────

alter table payment_refunds enable row level security;

create policy "admin full access" on payment_refunds
  for all to authenticated using (true) with check (true);
