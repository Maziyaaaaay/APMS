-- ONE-TIME DESTRUCTIVE OPERATION. Never run as a deployment migration.
-- Before execution: export and verify a Supabase database backup.
-- For psql, run in the same session before this file:
--   SET app.apms_reset_confirmation = 'APMS-RESET-ACCOUNTS-AND-ACTIVITY';
-- The confirmation guard intentionally fails if that session setting is absent.

begin;

do $$
begin
  if current_setting('app.apms_reset_confirmation', true)
       is distinct from 'APMS-RESET-ACCOUNTS-AND-ACTIVITY' then
    raise exception 'Reset blocked. Set the explicit APMS reset confirmation after verifying a database backup.';
  end if;
end;
$$;

drop trigger if exists protect_last_super_admin_update on public.users;
drop trigger if exists protect_last_super_admin_delete on public.users;

delete from public.certificate_review_events;
delete from public.account_review_events;
delete from public.certificates;
delete from public.users;

create trigger protect_last_super_admin_update
before update of is_super_admin on public.users
for each row execute function public.protect_last_super_admin();

create trigger protect_last_super_admin_delete
before delete on public.users
for each row execute function public.protect_last_super_admin();

commit;

-- After this transaction, run `npm run seed` from server/ with the new
-- SUPER_ADMIN_* secrets configured. Do not reopen public access before seeding.
