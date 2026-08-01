-- ============================================================================
-- AlDaftar — Payment Refunds — Migration 0007 — DOWN
--
-- Reverses 0007_payment_refunds_up.sql. Destructive: drops the
-- payment_refunds table and all refunds in it. Only for rolling back a
-- failed application of 0007 — never run against a book that has posted
-- refunds (they are part of the permanent history, BDD-011).
-- ============================================================================

drop policy if exists "admin full access" on payment_refunds;
drop index if exists payment_refunds_payment_idx;
drop index if exists payment_refunds_number_unique;
drop table if exists payment_refunds;
