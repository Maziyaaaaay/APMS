-- Add signup email verification without locking out existing accounts.
-- Existing APMS rows receive the default timestamp; new self-signups explicitly set NULL.
begin;
alter table public.users
  add column if not exists email_verified_at timestamptz default now();
alter table public.users alter column email_verified_at set default now();
notify pgrst, 'reload schema';
commit;
