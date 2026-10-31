-- Permanent account removal is available only through the authenticated APMS
-- API, which calls this function with the service-role client after checking
-- the caller's JWT. Student submissions/files are deleted with student users.
begin;

alter table public.users drop constraint if exists users_approved_by_fkey;
alter table public.users add constraint users_approved_by_fkey
  foreign key (approved_by) references public.users(id) on delete set null;
alter table public.users drop constraint if exists users_last_modified_by_fkey;
alter table public.users add constraint users_last_modified_by_fkey
  foreign key (last_modified_by) references public.users(id) on delete set null;

alter table public.certificates drop constraint if exists certificates_student_id_fkey;
alter table public.certificates add constraint certificates_student_id_fkey
  foreign key (student_id) references public.users(id) on delete cascade;
alter table public.certificates drop constraint if exists certificates_reviewed_by_fkey;
alter table public.certificates add constraint certificates_reviewed_by_fkey
  foreign key (reviewed_by) references public.users(id) on delete set null;
alter table public.certificates drop constraint if exists certificates_review_metadata;
alter table public.certificates add constraint certificates_review_metadata check (
  (status = 'pending' and reviewed_at is null and reviewed_by is null)
  or (status <> 'pending' and reviewed_at is not null)
);

alter table public.account_review_events drop constraint if exists account_review_events_user_id_fkey;
alter table public.account_review_events add constraint account_review_events_user_id_fkey
  foreign key (user_id) references public.users(id) on delete cascade;
alter table public.account_review_events drop constraint if exists account_review_events_actor_id_fkey;
alter table public.account_review_events add constraint account_review_events_actor_id_fkey
  foreign key (actor_id) references public.users(id) on delete cascade;

alter table public.certificate_review_events drop constraint if exists certificate_review_events_certificate_id_fkey;
alter table public.certificate_review_events add constraint certificate_review_events_certificate_id_fkey
  foreign key (certificate_id) references public.certificates(id) on delete cascade;
alter table public.certificate_review_events alter column actor_id drop not null;
alter table public.certificate_review_events drop constraint if exists certificate_review_events_actor_id_fkey;
alter table public.certificate_review_events add constraint certificate_review_events_actor_id_fkey
  foreign key (actor_id) references public.users(id) on delete cascade;

alter table public.circulars drop constraint if exists circulars_created_by_fkey;
alter table public.circulars add constraint circulars_created_by_fkey
  foreign key (created_by) references public.users(id) on delete cascade;

-- Deleting a reviewer clears the attribution on their completed certificates,
-- while preserving each student's decision and awarded points. Permit only
-- this FK-driven one-column change through the otherwise immutable review guard.
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
    if student.account_status <> 'approved' or reviewer.department_id is distinct from student.department_id then
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

-- This FK housekeeping update is not a new faculty review decision.
create or replace function public.apms_audit_certificate() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if new.reviewed_by is null and old.reviewed_by is not null
    and (to_jsonb(new) - 'reviewed_by') = (to_jsonb(old) - 'reviewed_by') then
    return new;
  end if;
  insert into public.certificate_review_events(certificate_id, actor_id, old_status, new_status, old_points, new_points, notes)
  values (new.id, new.reviewed_by, old.status, new.status, old.points_awarded, new.points_awarded, new.notes);
  return new;
end;
$$;

create or replace function public.apms_remove_user(p_user_id uuid, p_actor_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
    actor.role = 'faculty'
    and target.role = 'student'
    and actor.department_id is not distinct from target.department_id
  ) then
    raise exception 'Faculty can permanently remove only students in their own department. Other accounts require the super admin.';
  end if;

  -- A removed student's activity is removed with their account. The API then
  -- removes the corresponding private files from the certificate bucket.
  -- A removed faculty/admin's review events, account events, and authored
  -- circulars are removed by the foreign-key cascades. Student certificates
  -- remain, but their reviewer reference is cleared by ON DELETE SET NULL.
  delete from public.users where id = target.id;
end;
$$;

revoke all on function public.apms_remove_user(uuid, uuid) from public, anon, authenticated;
grant execute on function public.apms_remove_user(uuid, uuid) to service_role;

commit;
