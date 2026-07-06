-- ============================================================================
-- AlDaftar — initial schema — Migration 0001 — DOWN
--
-- Reverses 0001_init_up.sql completely. Dropping a table drops its policies
-- and indexes; storage policies are dropped explicitly; the bucket row is
-- removed only if it is empty (a non-empty bucket blocks deletion, which is
-- the safe failure: binaries are never destroyed silently by a rollback).
-- ============================================================================

drop policy if exists "app attachments read"   on storage.objects;
drop policy if exists "app attachments write"  on storage.objects;
drop policy if exists "app attachments delete" on storage.objects;

delete from storage.buckets where id = 'attachments';

drop table if exists settings;
drop table if exists audit;
drop table if exists attachments;
drop table if exists payments;
drop table if exists purchase_returns;
drop table if exists purchases;
drop table if exists products;
drop table if exists currencies;
drop table if exists units;
drop table if exists categories;
drop table if exists suppliers;
