-- APMS foundation migration. Safe to run on the original schema; never drops data.
begin;

do $$ begin
  if (select count(*) from public.users where is_super_admin) > 1 then
    raise exception 'Found more than one existing super admin. Review and choose the single retained account before applying APMS migration 001.';
  end if;
end $$;

alter table public.users
  add column if not exists account_status text not null default 'approved'
    check (account_status in ('pending', 'approved', 'rejected', 'disabled')),
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.users(id) on delete set null,
  add column if not exists department_id uuid references public.departments(id) on delete restrict;

alter table public.users drop constraint if exists users_super_admin_role_check;
alter table public.users add constraint users_super_admin_role_check
  check (not is_super_admin or role = 'admin') not valid;
alter table public.users validate constraint users_super_admin_role_check;

-- Soft deactivation keeps certificates and their audit history attached.
alter table public.certificates drop constraint if exists certificates_student_id_fkey;
alter table public.certificates add constraint certificates_student_id_fkey
  foreign key (student_id) references public.users(id) on delete restrict;
alter table public.certificates
  add column if not exists file_name text,
  add column if not exists file_mime_type text,
  add column if not exists file_size_bytes bigint,
  add column if not exists event_name text,
  add column if not exists activity_date date;

alter table public.circulars
  add column if not exists source_url text,
  add column if not exists issued_on date,
  add column if not exists created_by uuid references public.users(id) on delete set null;

-- Existing accounts remain usable after migration; new signups are pending in the API.
update public.users set approved_at = coalesce(approved_at, created_at, now())
where account_status = 'approved' and approved_at is null;

update public.users u set department_id = d.id
from public.departments d
where u.department_id is null and lower(trim(u.department)) = lower(trim(d.name));

create unique index if not exists users_single_super_admin_idx
  on public.users ((is_super_admin)) where is_super_admin;
create index if not exists users_status_role_idx on public.users(account_status, role);
create index if not exists users_department_id_idx on public.users(department_id, role);
create index if not exists certificates_department_review_idx on public.certificates(status, student_id);
create index if not exists certificates_student_event_idx on public.certificates(student_id, event_name, activity_date);

-- Private certificate objects are served only through short-lived signed URLs
-- issued by the authenticated API using its server-only service key.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('apms-certificates', 'apms-certificates', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.account_review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict,
  actor_id uuid references public.users(id) on delete set null,
  old_status text,
  new_status text not null check (new_status in ('pending', 'approved', 'rejected', 'disabled')),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.certificate_review_events (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.certificates(id) on delete restrict,
  actor_id uuid references public.users(id) on delete set null,
  old_status text,
  new_status text not null check (new_status in ('pending', 'approved', 'rejected')),
  old_points integer,
  new_points integer,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.account_review_events enable row level security;
alter table public.certificate_review_events enable row level security;
revoke all on public.account_review_events from anon, authenticated;
revoke all on public.certificate_review_events from anon, authenticated;

create or replace function public.protect_last_super_admin()
returns trigger language plpgsql as $$
begin
  if old.is_super_admin then
    if tg_op = 'DELETE' then
      if not exists (
        select 1 from public.users u
        where u.id <> old.id and u.is_super_admin = true
      ) then
        raise exception 'The only super admin cannot be removed or demoted';
      end if;
    elsif not new.is_super_admin then
      if not exists (
        select 1 from public.users u
        where u.id <> old.id and u.is_super_admin = true
      ) then
        raise exception 'The only super admin cannot be removed or demoted';
      end if;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists protect_last_super_admin_update on public.users;
create trigger protect_last_super_admin_update
before update of is_super_admin on public.users
for each row execute function public.protect_last_super_admin();
drop trigger if exists protect_last_super_admin_delete on public.users;
create trigger protect_last_super_admin_delete
before delete on public.users
for each row execute function public.protect_last_super_admin();

commit;
