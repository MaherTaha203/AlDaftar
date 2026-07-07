-- ============================================================================
-- AlDaftar — Migration 0004 — DOWN (restores default EXECUTE grants)
--
-- Restores the PostgreSQL default: functions are executable by PUBLIC unless
-- revoked. Only needed if some tooling legitimately must call the function
-- through the REST RPC surface — the trigger itself never requires it.
-- ============================================================================

grant execute on function public.enforce_single_admin() to public, anon, authenticated;
