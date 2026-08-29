-- Keep every learner-facing read and workbook intervention inside an active
-- organisation/class boundary.  These helpers are used by RLS as well as the
-- workbook decision trigger, so the database remains authoritative even when
-- a caller bypasses the application UI.

create or replace function public.can_manage_class(class_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1
    from public.classes class
    join public.user_profiles actor on actor.id=auth.uid()
    where class.id=class_uuid
      and class.organisation_id=actor.organisation_id
      and class.archived_at is null
      and actor.archived_at is null
      and (
        actor.role='administrator'
        or (
          actor.role='teacher'
          and (
            class.teacher_id=actor.id
            or exists(
              select 1
              from public.class_teachers class_teacher
              where class_teacher.class_id=class.id
                and class_teacher.teacher_id=actor.id
                and class_teacher.archived_at is null
            )
          )
        )
      )
  )
$$;

create or replace function public.can_access_class(class_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1
    from public.classes class
    join public.user_profiles actor on actor.id=auth.uid()
    where class.id=class_uuid
      and class.organisation_id=actor.organisation_id
      and class.archived_at is null
      and actor.archived_at is null
      and (
        actor.role='administrator'
        or (
          actor.role='teacher'
          and (
            class.teacher_id=actor.id
            or exists(
              select 1
              from public.class_teachers class_teacher
              where class_teacher.class_id=class.id
                and class_teacher.teacher_id=actor.id
                and class_teacher.archived_at is null
            )
          )
        )
        or (
          actor.role='student'
          and exists(
            select 1
            from public.enrolments enrolment
            where enrolment.class_id=class.id
              and enrolment.student_id=actor.id
              and enrolment.archived_at is null
          )
        )
      )
  )
$$;

create or replace function public.can_access_learner(learner_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1
    from public.user_profiles actor
    join public.user_profiles learner on learner.id=learner_uuid
    where actor.id=auth.uid()
      and actor.archived_at is null
      and learner.archived_at is null
      and actor.organisation_id=learner.organisation_id
      and (
        actor.id=learner.id
        or actor.role='administrator'
        or (
          actor.role='teacher'
          and exists(
            select 1
            from public.enrolments enrolment
            join public.classes class on class.id=enrolment.class_id
            where enrolment.student_id=learner.id
              and enrolment.archived_at is null
              and (
                class.teacher_id=actor.id
                or exists(
                  select 1
                  from public.class_teachers class_teacher
                  where class_teacher.class_id=class.id
                    and class_teacher.teacher_id=actor.id
                    and class_teacher.archived_at is null
                )
              )
              and class.organisation_id=actor.organisation_id
              and class.archived_at is null
          )
        )
      )
  )
$$;

create or replace function public.can_manage_workbook_learner_unit(
  learner_uuid uuid,
  unit_code_value text
) returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1
    from public.user_profiles actor
    join public.user_profiles learner
      on learner.id=learner_uuid
      and learner.organisation_id=actor.organisation_id
      and learner.role='student'
      and learner.archived_at is null
    where actor.id=auth.uid()
      and actor.role in ('teacher','administrator')
      and actor.archived_at is null
      and exists(
        select 1
        from public.enrolments enrolment
        join public.classes class on class.id=enrolment.class_id
        join public.class_units class_unit on class_unit.class_id=class.id
        join public.units unit on unit.id=class_unit.unit_id
        where enrolment.student_id=learner.id
          and enrolment.archived_at is null
          and class.organisation_id=actor.organisation_id
          and class.archived_at is null
          and (
            actor.role='administrator'
            or class.teacher_id=actor.id
            or exists(
              select 1
              from public.class_teachers class_teacher
              where class_teacher.class_id=class.id
                and class_teacher.teacher_id=actor.id
                and class_teacher.archived_at is null
            )
          )
          and class_unit.active
          and class_unit.archived_at is null
          and unit.code=unit_code_value
          and unit.archived_at is null
      )
  )
$$;

revoke all on function public.can_manage_workbook_learner_unit(uuid,text) from public,anon;
grant execute on function public.can_manage_workbook_learner_unit(uuid,text) to authenticated;

create or replace function public.scope_workbook_teacher_decision()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare actor public.user_profiles;
begin
  select * into actor
  from public.user_profiles
  where id=auth.uid() and archived_at is null;

  if actor.id is null or actor.role not in ('teacher','administrator') then
    raise exception 'teacher_required' using errcode='42501';
  end if;
  if not public.can_manage_workbook_learner_unit(new.learner_id,new.unit_code) then
    raise exception 'learner_or_unit_out_of_scope' using errcode='42501';
  end if;

  new.teacher_id=actor.id;
  new.organisation_id=actor.organisation_id;
  return new;
end;
$$;

drop policy if exists workbook_teacher_decisions_read on public.workbook_teacher_decisions;
create policy workbook_teacher_decisions_read
on public.workbook_teacher_decisions
for select
to authenticated
using (public.can_access_learner(learner_id));

comment on function public.can_manage_workbook_learner_unit(uuid,text) is
  'True only for active administrators in the learner organisation or the teacher of an active class that assigns this unit to the learner.';
comment on table public.workbook_teacher_decisions is
  'Audited teacher decisions. Writes require an active learner, an assigned unit and an owning teacher/admin class boundary.';
