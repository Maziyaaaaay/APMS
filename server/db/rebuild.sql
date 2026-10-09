-- APMS REBUILD — KTU APMS (xikqrthyuuqhptunigde)
-- User requested a fresh structure without a backup.
-- DESTRUCTIVE: removes APMS accounts, activity records, review history, notices,
-- department definitions, and admin notes. Run once in the correct project's SQL Editor.
-- Storage file bytes must be cleared separately through Storage; never via SQL.
-- Only named APMS tables/functions are dropped. Unexpected dependencies abort the transaction.
begin;
drop table if exists public.certificate_review_events;
drop table if exists public.account_review_events;
drop table if exists public.certificates;
drop table if exists public.circulars;
drop table if exists public.point_overrides;
drop table if exists public.users;
drop table if exists public.departments;
drop function if exists public.protect_last_super_admin();
drop function if exists public.apms_prepare_user();
drop function if exists public.apms_audit_user();
drop function if exists public.apms_require_owner();
drop function if exists public.apms_sync_department_name();
drop function if exists public.apms_validate_certificate();
drop function if exists public.apms_audit_certificate();
drop function if exists public.apms_transfer_super_admin(uuid, uuid);


create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 150),
  created_at timestamptz not null default now()
);
create unique index departments_name_ci on public.departments (lower(trim(name)));

create table public.users (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('student', 'faculty', 'admin')),
  is_super_admin boolean not null default false,
  account_status text not null default 'pending'
    check (account_status in ('pending', 'approved', 'rejected', 'disabled')),
  username text not null unique check (username ~ '^[a-z0-9][a-z0-9._-]{2,63}$'),
  password_hash text not null,
  session_version integer not null default 1 check (session_version > 0),
  name text not null check (length(trim(name)) between 1 and 150),
  email text,
  profile_url text,
  department_id uuid references public.departments(id) on delete restrict,
  department text, -- compatibility display value; a trigger derives this from department_id
  roll_no text,
  class text,
  year integer check (year between 1 and 6),
  semester integer check (semester between 1 and 12),
  student_type text check (student_type in ('regular', 'lateral', 'pwd')),
  designation text,
  approved_at timestamptz,
  approved_by uuid references public.users(id) on delete restrict,
  last_modified_by uuid references public.users(id) on delete restrict,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_super_admin_active check (not is_super_admin or (role = 'admin' and account_status = 'approved')),
  constraint users_department_required check (role = 'admin' or department_id is not null),
  constraint users_student_type_required check (role <> 'student' or student_type is not null)
);
create unique index users_single_super_admin_idx on public.users ((is_super_admin)) where is_super_admin;
create unique index users_roll_no_unique on public.users (upper(trim(roll_no))) where roll_no is not null;
create index users_department_status_idx on public.users (department_id, role, account_status);
create index users_status_role_idx on public.users (account_status, role);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete restrict,
  activity_id text not null,
  catalog_version text not null,
  activity_snapshot jsonb not null check (jsonb_typeof(activity_snapshot) = 'object'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  points_awarded integer not null check (points_awarded between 0 and 40),
  level_selected text,
  hours integer check (hours > 0),
  description text,
  event_name text not null check (length(trim(event_name)) between 1 and 180),
  activity_date date not null,
  notes text,
  file_url text not null unique, -- private Storage object path; never a public URL
  file_name text,
  file_mime_type text not null check (file_mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  file_size_bytes bigint not null check (file_size_bytes between 1 and 10485760),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.users(id) on delete restrict,
  constraint certificates_review_metadata check (
    (status = 'pending' and reviewed_at is null and reviewed_by is null)
    or (status <> 'pending' and reviewed_at is not null and reviewed_by is not null)
  ),
  constraint certificates_rejection_reason check (status <> 'rejected' or length(trim(coalesce(notes, ''))) > 0)
);
create index certificates_student_status_idx on public.certificates (student_id, status, created_at desc);
create index certificates_review_queue_idx on public.certificates (created_at) where status = 'pending';
create index certificates_event_idx on public.certificates (student_id, activity_id, activity_date);

create table public.account_review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict,
  actor_id uuid references public.users(id) on delete restrict,
  old_status text,
  new_status text not null,
  old_role text,
  new_role text not null,
  was_super_admin boolean,
  is_super_admin boolean not null,
  note text,
  created_at timestamptz not null default now()
);
create index account_events_user_idx on public.account_review_events (user_id, created_at desc);

create table public.certificate_review_events (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.certificates(id) on delete restrict,
  actor_id uuid not null references public.users(id) on delete restrict,
  old_status text not null,
  new_status text not null,
  old_points integer not null,
  new_points integer not null,
  notes text,
  created_at timestamptz not null default now()
);
create index certificate_events_id_idx on public.certificate_review_events (certificate_id, created_at desc);

create table public.circulars (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 200),
  content text not null check (length(trim(content)) > 0),
  source_url text,
  issued_on date,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- Legacy API name retained for administrator explanations, never scoring overrides.
create table public.point_overrides (
  activity_id text primary key,
  override jsonb not null check (
    override ? 'note' and jsonb_typeof(override -> 'note') = 'string'
    and length(trim(override ->> 'note')) between 1 and 1000
    and override - 'note' = '{}'::jsonb
  ),
  updated_at timestamptz not null default now()
);

create function public.apms_prepare_user() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  new.username := lower(trim(new.username));
  new.name := trim(new.name);
  new.roll_no := nullif(upper(trim(new.roll_no)), '');
  if new.department_id is null then
    new.department := null;
  else
    select name into new.department from public.departments where id = new.department_id;
  end if;
  if tg_op = 'UPDATE' then
    if new.password_hash is distinct from old.password_hash
      or new.role is distinct from old.role
      or new.account_status is distinct from old.account_status
      or new.is_super_admin is distinct from old.is_super_admin then
      new.session_version := old.session_version + 1;
    end if;
  end if;
  if new.account_status = 'approved' then
    new.approved_at := coalesce(new.approved_at, now());
  else
    new.approved_at := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger apms_prepare_user before insert or update on public.users
for each row execute function public.apms_prepare_user();

create function public.apms_audit_user() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    insert into public.account_review_events(user_id, actor_id, new_status, new_role, is_super_admin, note)
    values (new.id, new.last_modified_by, new.account_status, new.role, new.is_super_admin, 'Account created');
  elsif old.account_status is distinct from new.account_status or old.role is distinct from new.role
    or old.is_super_admin is distinct from new.is_super_admin then
    insert into public.account_review_events(user_id, actor_id, old_status, new_status, old_role, new_role,
      was_super_admin, is_super_admin, note)
    values (new.id, new.last_modified_by, old.account_status, new.account_status, old.role, new.role,
      old.is_super_admin, new.is_super_admin, new.review_note);
  end if;
  return new;
end;
$$;
create trigger apms_audit_user after insert or update on public.users
for each row execute function public.apms_audit_user();

-- Deferral allows an atomic handover while requiring one owner at transaction commit.
create function public.apms_require_owner() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if old.is_super_admin and not exists (select 1 from public.users where is_super_admin) then
    raise exception 'The super admin must be transferred to another approved admin before removal.';
  end if;
  return null;
end;
$$;
create constraint trigger apms_require_owner after update or delete on public.users
 deferrable initially deferred for each row execute function public.apms_require_owner();

create function public.apms_sync_department_name() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  update public.users set department = new.name where department_id = new.id;
  return new;
end;
$$;
create trigger apms_sync_department_name after update of name on public.departments
for each row execute function public.apms_sync_department_name();

create function public.apms_validate_certificate() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare
  student public.users;
  reviewer public.users;
begin
  if tg_op = 'INSERT' then
    select * into student from public.users where id = new.student_id;
    if student.role <> 'student' or student.account_status <> 'approved' then
      raise exception 'Only approved students can submit activity documents.';
    end if;
    if new.status <> 'pending' then raise exception 'New submissions must await review.'; end if;
    if new.activity_date > current_date then raise exception 'The activity date cannot be in the future.'; end if;
  else
    if old.status <> 'pending' then raise exception 'A completed review cannot be overwritten.'; end if;
    if new.student_id <> old.student_id or new.activity_id <> old.activity_id
      or new.activity_snapshot is distinct from old.activity_snapshot
      or new.catalog_version <> old.catalog_version or new.file_url <> old.file_url
      or new.event_name <> old.event_name or new.activity_date <> old.activity_date
      or new.level_selected is distinct from old.level_selected or new.hours is distinct from old.hours then
      raise exception 'Submitted activity evidence is immutable.';
    end if;
    if new.status not in ('approved', 'rejected') then raise exception 'Choose an approval or rejection decision.'; end if;
    select * into reviewer from public.users where id = new.reviewed_by;
    select * into student from public.users where id = new.student_id;
    if reviewer.id is null or reviewer.account_status <> 'approved' or reviewer.role not in ('admin', 'faculty') then
      raise exception 'An approved faculty member or admin must review the submission.';
    end if;
    if reviewer.role = 'faculty' and (student.account_status <> 'approved'
      or reviewer.department_id is distinct from student.department_id) then
      raise exception 'Faculty may only review approved students in their department.';
    end if;
    if new.points_awarded <> old.points_awarded and length(trim(coalesce(new.notes, ''))) = 0 then
      raise exception 'Point adjustments require an explanation.';
    end if;
    new.reviewed_at := now();
  end if;
  if new.activity_snapshot ->> 'id' is distinct from new.activity_id
    or coalesce((new.activity_snapshot ->> 'group')::integer, 0) not between 1 and 3
    or coalesce((new.activity_snapshot ->> 'maxPoints')::integer, 0) not between 1 and 40
    or new.points_awarded > (new.activity_snapshot ->> 'maxPoints')::integer then
    raise exception 'The award does not match the saved activity catalog.';
  end if;
  return new;
end;
$$;
create trigger apms_validate_certificate before insert or update on public.certificates
for each row execute function public.apms_validate_certificate();

create function public.apms_audit_certificate() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  insert into public.certificate_review_events(certificate_id, actor_id, old_status, new_status, old_points, new_points, notes)
  values (new.id, new.reviewed_by, old.status, new.status, old.points_awarded, new.points_awarded, new.notes);
  return new;
end;
$$;
create trigger apms_audit_certificate after update on public.certificates
for each row execute function public.apms_audit_certificate();

-- Backend-only RPC. The API checks the current owner's password before calling.
create function public.apms_transfer_super_admin(p_actor_id uuid, p_target_id uuid) returns void
language plpgsql set search_path = public, pg_temp as $$
declare
  actor public.users;
  target public.users;
begin
  perform id from public.users where id in (p_actor_id, p_target_id) order by id for update;
  select * into actor from public.users where id = p_actor_id;
  select * into target from public.users where id = p_target_id;
  if actor.id is null or not actor.is_super_admin or actor.account_status <> 'approved' then
    raise exception 'Only the current super admin can transfer ownership.';
  end if;
  if target.id is null or target.id = actor.id or target.role <> 'admin' or target.account_status <> 'approved' then
    raise exception 'Choose another approved administrator.';
  end if;
  update public.users set is_super_admin = false, last_modified_by = actor.id,
    review_note = 'Super admin access transferred to another administrator.' where id = actor.id;
  update public.users set is_super_admin = true, last_modified_by = actor.id,
    review_note = 'Super admin access received from the previous owner.' where id = target.id;
end;
$$;

-- App users authenticate with the API. No browser role has direct table access.
do $$ declare t text; begin
  foreach t in array array['departments','users','certificates','account_review_events',
    'certificate_review_events','circulars','point_overrides'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
end $$;
revoke update, delete on public.account_review_events, public.certificate_review_events from service_role;
revoke all on function public.apms_prepare_user(), public.apms_audit_user(), public.apms_require_owner(),
  public.apms_sync_department_name(), public.apms_validate_certificate(), public.apms_audit_certificate(),
  public.apms_transfer_super_admin(uuid, uuid) from public, anon, authenticated;
grant execute on function public.apms_transfer_super_admin(uuid, uuid) to service_role;

insert into public.departments (name) values
 ('Computer Science'), ('Information Technology'), ('Electronics and Communication Engineering'),
 ('Electrical Engineering'), ('Civil Engineering'), ('Mechanical Engineering'), ('Electrical and Computer Science');

-- File bytes are managed through the Storage API, never deleted via storage.objects SQL.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('apms-certificates', 'apms-certificates', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Restrictive policy prevents any old permissive policy from exposing this bucket.
drop policy if exists apms_certificates_api_only on storage.objects;
create policy apms_certificates_api_only on storage.objects as restrictive for all
  to anon, authenticated using (bucket_id <> 'apms-certificates')
  with check (bucket_id <> 'apms-certificates');

notify pgrst, 'reload schema';
commit;
