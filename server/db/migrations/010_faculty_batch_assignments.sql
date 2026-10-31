-- Assign each student cohort to one approved faculty advisor.
-- Additive migration: existing account and activity rows are preserved.
begin;

alter table public.users
  add column if not exists batch_year integer,
  add column if not exists evaluation_batches integer[] not null default '{}';

alter table public.users drop constraint if exists users_batch_year_check;
alter table public.users add constraint users_batch_year_check
  check (batch_year is null or batch_year between 2000 and 2100);

create index if not exists users_department_batch_status_idx
  on public.users (department_id, batch_year, role, account_status);

-- KTU identifiers encode the admission year after the college prefix, for
-- example TLY24IT032. Ambiguous historical identifiers are left unassigned.
update public.users
set batch_year = case
  when upper(trim(roll_no)) ~ '^[A-Z]{2,5}20[0-9]{2}[A-Z]'
    then substring(upper(trim(roll_no)) from '^[A-Z]{2,5}(20[0-9]{2})')::integer
  when upper(trim(roll_no)) ~ '^[A-Z]{2,5}[0-9]{2}[A-Z]'
    then 2000 + substring(upper(trim(roll_no)) from '^[A-Z]{2,5}([0-9]{2})')::integer
  else null
end
where role = 'student' and batch_year is null and roll_no is not null;

create or replace function public.apms_validate_faculty_batches() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare
  batch integer;
begin
  if new.evaluation_batches is null then new.evaluation_batches := '{}'; end if;
  if coalesce(cardinality(new.evaluation_batches), 0) > 8
    or exists (select 1 from unnest(new.evaluation_batches) as b where b is null or b < 2000 or b > 2100)
    or (select count(distinct b) from unnest(new.evaluation_batches) as b) <> coalesce(cardinality(new.evaluation_batches), 0) then
    raise exception 'Faculty batch assignments must contain up to eight unique years between 2000 and 2100.' using errcode = '23514';
  end if;
  if new.role <> 'faculty' or new.account_status <> 'approved' then return new; end if;
  for batch in select distinct value from unnest(new.evaluation_batches) as value order by value loop
    perform pg_advisory_xact_lock(126342, batch);
    if exists (
      select 1 from public.users existing
      where existing.id <> new.id and existing.role = 'faculty'
        and existing.account_status = 'approved' and batch = any(existing.evaluation_batches)
    ) then
      raise exception 'Batch % is already assigned to another approved faculty advisor.', batch using errcode = '23505';
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists apms_validate_faculty_batches on public.users;
create trigger apms_validate_faculty_batches before insert or update of role, account_status, evaluation_batches on public.users
for each row execute function public.apms_validate_faculty_batches();

-- The existing 2024 advisor is confirmed as Resna R. Do not infer mappings for
-- other batches or overwrite assignments already made by an administrator.
update public.users
set evaluation_batches = array[2024]
where role = 'faculty' and account_status = 'approved'
  and lower(trim(name)) = lower('Resna R')
  and cardinality(evaluation_batches) = 0;

create or replace function public.apms_validate_certificate() returns trigger
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
    if new.activity_date > (now() at time zone 'Asia/Kolkata')::date then raise exception 'The activity date cannot be in the future.'; end if;
    if new.academic_year is null then raise exception 'An academic year is required for a new submission.'; end if;
  else
    if new.reviewed_by is null and old.reviewed_by is not null
      and (to_jsonb(new) - 'reviewed_by') = (to_jsonb(old) - 'reviewed_by') then
      return new;
    end if;
    if old.status <> 'pending' then raise exception 'A completed review cannot be overwritten.'; end if;
    if new.student_id <> old.student_id or new.activity_id <> old.activity_id
      or new.activity_snapshot is distinct from old.activity_snapshot
      or new.catalog_version <> old.catalog_version or new.file_url <> old.file_url
      or new.event_name <> old.event_name or new.activity_date <> old.activity_date
      or new.academic_year is distinct from old.academic_year
      or new.level_selected is distinct from old.level_selected or new.hours is distinct from old.hours then
      raise exception 'Submitted activity evidence is immutable.';
    end if;
    if new.status not in ('approved', 'rejected') then raise exception 'Choose an approval or rejection decision.'; end if;
    select * into reviewer from public.users where id = new.reviewed_by;
    select * into student from public.users where id = new.student_id;
    if reviewer.id is null or reviewer.account_status <> 'approved' or reviewer.role <> 'faculty' then
      raise exception 'An approved faculty advisor must review the submission.';
    end if;
    if student.account_status <> 'approved' or reviewer.department_id is distinct from student.department_id
      or student.batch_year is null or not (student.batch_year = any(reviewer.evaluation_batches)) then
      raise exception 'Faculty may only review approved students in their assigned batches.';
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

create or replace function public.apms_remove_user(p_user_id uuid, p_actor_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  target public.users;
  actor public.users;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Permanent account removal must be requested through the APMS server.';
  end if;
  select * into actor from public.users where id = p_actor_id for update;
  if actor.id is null or actor.account_status <> 'approved' or actor.role not in ('admin', 'faculty') then
    raise exception 'Only an approved faculty advisor or admin can remove accounts.';
  end if;
  select * into target from public.users where id = p_user_id for update;
  if target.id is null then raise exception 'Account not found.'; end if;
  if target.id = actor.id then raise exception 'You cannot remove your own account.'; end if;
  if target.is_super_admin then raise exception 'The super admin account cannot be removed.'; end if;
  if actor.is_super_admin is not true and not (
    actor.role = 'faculty' and target.role = 'student'
    and actor.department_id is not distinct from target.department_id
    and target.batch_year = any(actor.evaluation_batches)
  ) then
    raise exception 'Faculty can permanently remove only students in their assigned batches. Other accounts require the super admin.';
  end if;
  delete from public.users where id = target.id;
end;
$$;
revoke all on function public.apms_remove_user(uuid, uuid) from public, anon, authenticated;
grant execute on function public.apms_remove_user(uuid, uuid) to service_role;

commit;
