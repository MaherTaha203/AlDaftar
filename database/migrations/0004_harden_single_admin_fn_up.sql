-- ============================================================================
-- AlDaftar — harden the single-admin trigger function — Migration 0004 — UP
--
-- Security advisors 0028/0029: public.enforce_single_admin() is a SECURITY
-- DEFINER function living in the exposed `public` schema, so PostgREST made
-- it callable by the anon and authenticated roles via /rest/v1/rpc/. Calling
-- it there is harmless-but-wrong surface: trigger enforcement executes as the
-- function owner and does NOT depend on the caller's EXECUTE privilege, so
-- revoking it changes nothing about the single-admin guarantee (0003).
--
-- Applied to production (project wvzffzsfiwsmwruawmgi) on 2026-07-07 during
-- the deployment audit; this file synchronizes the repository with that state.
-- ============================================================================

revoke execute on function public.enforce_single_admin() from public, anon, authenticated;
