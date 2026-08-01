-- ============================================================================
-- AlDaftar — Reversal Cancellation for Adjustment Documents — Migration 0008 — DOWN
--
-- Reverts the BDD-011 cancellation amendment: drops the cancellation columns
-- and narrows both status CHECK constraints back to draft/posted.
--
-- WARNING: fails (by design) if any row is already 'cancelled' — a cancelled
-- document is a permanent business record; resolve those rows deliberately
-- before rolling back.
-- ============================================================================

-- ── supplier_credit_notes ────────────────────────────────────────────────────

alter table supplier_credit_notes
  drop column if exists "cancelReason";

alter table supplier_credit_notes
  drop column if exists "cancelledAt";

alter table supplier_credit_notes
  drop constraint if exists supplier_credit_notes_status_check;

alter table supplier_credit_notes
  add constraint supplier_credit_notes_status_check
  check ("status" in ('draft', 'posted'));

-- ── payment_refunds ──────────────────────────────────────────────────────────

alter table payment_refunds
  drop column if exists "cancelReason";

alter table payment_refunds
  drop column if exists "cancelledAt";

alter table payment_refunds
  drop constraint if exists payment_refunds_status_check;

alter table payment_refunds
  add constraint payment_refunds_status_check
  check ("status" in ('draft', 'posted'));
