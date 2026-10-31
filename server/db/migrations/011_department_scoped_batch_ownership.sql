-- Faculty responsibility is unique per department and admission batch.
-- A college may have different advisors for the same cohort in different departments.
begin;

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
    perform pg_advisory_xact_lock(hashtext(new.department_id::text), batch);
    if exists (
      select 1 from public.users existing
      where existing.id <> new.id and existing.role = 'faculty'
        and existing.account_status = 'approved'
        and existing.department_id is not distinct from new.department_id
        and batch = any(existing.evaluation_batches)
    ) then
      raise exception 'Batch % is already assigned to another approved faculty advisor in this department.', batch using errcode = '23505';
    end if;
  end loop;
  return new;
end;
$$;

commit;
