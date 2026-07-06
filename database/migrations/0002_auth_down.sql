-- ============================================================================
-- AlDaftar — single-administrator authentication — Migration 0002 — DOWN
-- Restores the pre-auth policies (anonymous app key), exactly as 0001 left
-- them. Data is untouched.
-- ============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'suppliers','categories','units','currencies','products',
    'purchases','purchase_returns','payments','attachments','settings'
  ] loop
    execute format('drop policy if exists "admin full access" on %I', t);
    execute format(
      'create policy "app full access" on %I for all to anon using (true) with check (true)', t
    );
  end loop;
end $$;

drop policy if exists "admin read"   on audit;
drop policy if exists "admin append" on audit;
create policy "app read"   on audit for select to anon using (true);
create policy "app append" on audit for insert to anon with check (true);

drop policy if exists "admin attachments read"   on storage.objects;
drop policy if exists "admin attachments write"  on storage.objects;
drop policy if exists "admin attachments delete" on storage.objects;

create policy "app attachments read"
  on storage.objects for select to anon using (bucket_id = 'attachments');
create policy "app attachments write"
  on storage.objects for insert to anon with check (bucket_id = 'attachments');
create policy "app attachments delete"
  on storage.objects for delete to anon using (bucket_id = 'attachments');
