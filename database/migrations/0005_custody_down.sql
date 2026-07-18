-- ============================================================================
-- AlDaftar — Custody vouchers (سند عهدة) — Migration 0005 — DOWN
-- Reverses 0005_custody_up.sql. Dropping the tables removes their indexes.
-- ============================================================================

drop policy if exists "admin full access" on custody_returns;
drop policy if exists "admin full access" on custody;

drop table if exists custody_returns;
drop table if exists custody;
