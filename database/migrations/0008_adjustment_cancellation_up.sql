-- ============================================================================
-- AlDaftar — Reversal Cancellation for Adjustment Documents — Migration 0008 — UP
--
-- BDD-011 amendment (الإلغاء العكسي): a POSTED credit note or payment refund
-- may be cancelled — never edited, never deleted. Cancellation is a permanent,
-- reasoned status transition: the document's content and official number stay
-- frozen forever; only its financial effect is removed. Every derived figure
-- already filters on status = 'posted', so a cancelled document drops out of
-- balances, statements and caps with no aggregation change.
--
-- PARITY-FIRST additions (TypeScript fields VERBATIM, quoted camelCase):
--   "cancelledAt"  text     — set by the cancellation; null while it stands
--   "cancelReason" text     — the owner's stated reason ('' while it stands)
-- Plus: widen both status CHECK constraints to allow 'cancelled'.
--
-- The inline status checks of 0006/0007 were unnamed, so Postgres auto-named
-- them <table>_status_check — dropped and re-created here by that name.
--
-- Apply AFTER 0001–0007. Run `npm run verify:schema` after applying.
-- ============================================================================

-- ── supplier_credit_notes ────────────────────────────────────────────────────

alter table supplier_credit_notes
  drop constraint if exists supplier_credit_notes_status_check;

alter table supplier_credit_notes
  add constraint supplier_credit_notes_status_check
  check ("status" in ('draft', 'posted', 'cancelled'));

alter table supplier_credit_notes
  add column if not exists "cancelledAt" text;

alter table supplier_credit_notes
  add column if not exists "cancelReason" text not null default '';

-- ── payment_refunds ──────────────────────────────────────────────────────────

alter table payment_refunds
  drop constraint if exists payment_refunds_status_check;

alter table payment_refunds
  add constraint payment_refunds_status_check
  check ("status" in ('draft', 'posted', 'cancelled'));

alter table payment_refunds
  add column if not exists "cancelledAt" text;

alter table payment_refunds
  add column if not exists "cancelReason" text not null default '';
