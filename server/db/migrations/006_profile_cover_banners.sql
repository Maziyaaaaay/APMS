-- Add a personal cover image field to student and faculty profiles.
-- Existing profile photos remain untouched.
begin;
alter table public.users add column if not exists profile_banner_url text;
notify pgrst, 'reload schema';
commit;
