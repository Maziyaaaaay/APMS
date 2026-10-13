-- Persist the urgency level selected for each faculty-facing circular.
begin;

alter table public.circulars
  add column priority text not null default 'normal'
  check (priority in ('normal', 'urgent', 'info'));

notify pgrst, 'reload schema';
commit;
