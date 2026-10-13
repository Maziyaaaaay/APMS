-- Persist the urgency level selected for each faculty-facing circular.
begin;

alter table public.circulars
  add column if not exists priority text not null default 'normal';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.circulars'::regclass
      and conname = 'circulars_priority_check'
  ) then
    alter table public.circulars
      add constraint circulars_priority_check
      check (priority in ('normal', 'urgent', 'info'));
  end if;
end;
$$;

notify pgrst, 'reload schema';
commit;
