-- ============================================================================
-- AlDaftar — Supplier Credit Notes — Migration 0006 — DOWN
--
-- Reverses 0006_credit_notes_up.sql. Destructive: drops the
-- supplier_credit_notes table and all credit notes in it. Only for rolling
-- back a failed application of 0006 — never run against a book that has
-- posted credit notes (they are part of the permanent history, BDD-011).
-- ============================================================================

drop policy if exists "admin full access" on supplier_credit_notes;
drop index if exists supplier_credit_notes_purchase_idx;
drop index if exists supplier_credit_notes_number_unique;
drop table if exists supplier_credit_notes;
