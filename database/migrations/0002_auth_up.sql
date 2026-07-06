-- ============================================================================
-- AlDaftar — single-administrator authentication — Migration 0002 — UP
--
-- Switches every RLS policy from the anonymous role to AUTHENTICATED users
-- only (owner decision: one admin account, Supabase Auth, email+password).
-- After this migration the anon key alone can read/write NOTHING; every
-- request must carry the signed-in administrator's JWT. The single-admin
-- rule is enforced operationally by scripts/create-admin.mjs (refuses to
-- create a second account) — no roles/permissions tables exist by design.
--
-- Audit stays append-only IN DEPTH: the authenticated role gets SELECT +
-- INSERT only; UPDATE/DELETE remain impossible through the application.
-- ============================================================================

-- ── Business tables: anon → authenticated ───────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array[
    'suppliers','categories','units','currencies','products',
    'purchases','purchase_returns','payments','attachments','settings'
  ] loop
    execute format('drop policy if exists "app full access" on %I', t);
    execute format(
      'create policy "admin full access" on %I for all to authenticated using (true) with check (true)', t
    );
  end loop;
end $$;

-- ── Audit: append-only for the authenticated administrator ──────────────────

drop policy if exists "app read"   on audit;
drop policy if exists "app append" on audit;
create policy "admin read"   on audit for select to authenticated using (true);
create policy "admin append" on audit for insert to authenticated with check (true);

-- ── Storage: attachments bucket for the authenticated administrator ─────────

drop policy if exists "app attachments read"   on storage.objects;
drop policy if exists "app attachments write"  on storage.objects;
drop policy if exists "app attachments delete" on storage.objects;

create policy "admin attachments read"
  on storage.objects for select to authenticated using (bucket_id = 'attachments');
create policy "admin attachments write"
  on storage.objects for insert to authenticated with check (bucket_id = 'attachments');
create policy "admin attachments delete"
  on storage.objects for delete to authenticated using (bucket_id = 'attachments');
