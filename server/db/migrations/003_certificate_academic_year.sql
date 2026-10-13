-- Preserve the academic year supplied with each new activity submission.
-- Existing rows remain null because their academic year cannot be inferred
-- reliably from the activity date.
begin;

alter table public.certificates
  add column academic_year text
  check (academic_year is null or academic_year ~ '^[0-9]{4}-[0-9]{2}$');

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
    if new.activity_date > current_date then raise exception 'The activity date cannot be in the future.'; end if;
    if new.academic_year is null then raise exception 'An academic year is required for a new submission.'; end if;
  else
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

commit;
