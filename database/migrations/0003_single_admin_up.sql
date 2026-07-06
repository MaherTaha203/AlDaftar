-- ============================================================================
-- AlDaftar — enforce single administrator IN THE DATABASE — Migration 0003 — UP
--
-- WHY: the single-admin rule (PD-18) was enforced only by scripts/create-admin
-- .mjs, which governs that one script. Supabase's /auth/v1/signup endpoint is
-- reachable with the public anon key that ships in the browser bundle; if the
-- project's "Disable signups" toggle is ever off, a second account could be
-- created and — because RLS grants every authenticated user full access — read
-- and write the owner's financial data. This migration makes "exactly one
-- account can ever exist" a DATABASE guarantee that does not depend on any
-- dashboard setting.
--
-- Belt-and-suspenders: the app still relies on "Disable signups" being ON in
-- the Supabase dashboard (documented in docs/operations/BACKUP_AND_RECOVERY.md
-- and RC-1). This trigger is the enforcement that holds even if that toggle is
-- wrong. Apply this migration AFTER 0001 and 0002; the first account (created
-- by `npm run admin:create`) is allowed, every later insert is rejected.
-- ============================================================================

-- Reject any INSERT into auth.users once one account already exists.
create or replace function public.enforce_single_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from auth.users) >= 1 then
    raise exception
      'AlDaftar is single-administrator: an account already exists (PD-18). '
      'Manage the existing account in the Supabase dashboard.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_single_admin on auth.users;
create trigger enforce_single_admin
  before insert on auth.users
  for each row execute function public.enforce_single_admin();

-- Belt-and-suspenders: ensure the anonymous role can never reach business data.
-- 0002 already dropped the anon policies; this makes the intent explicit and
-- durable so no future edit silently re-opens anonymous access.
revoke all on all tables in schema public from anon;
