-- ============================================================================
-- AlDaftar — Migration 0003 — DOWN (reverses the single-admin enforcement)
--
-- Removes the DB-level single-account guarantee. After this, "only one account"
-- again depends solely on scripts/create-admin.mjs and the Supabase "Disable
-- signups" setting. Does NOT delete any account or business data.
-- ============================================================================

drop trigger if exists enforce_single_admin on auth.users;
drop function if exists public.enforce_single_admin();

-- Note: the anon REVOKE from 0003 up is intentionally NOT re-granted here —
-- anonymous access must stay closed (0002 removed the anon policies). Re-open
-- only by deliberately recreating anon policies, never as a rollback side effect.
