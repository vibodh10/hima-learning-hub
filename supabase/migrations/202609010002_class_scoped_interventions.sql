-- Intervention records contain professional learner evidence and are not a
-- class-wide learner resource. Only staff who manage the exact active class
-- may read a row, and the named learner must be actively enrolled in that
-- class. Browser roles cannot create, rewrite or delete intervention history.

create or replace function public.can_read_class_intervention(
  class_uuid uuid,
  learner_uuid uuid
) returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select public.can_manage_class(class_uuid)
    and exists(
      select 1
      from public.classes class
      join public.enrolments enrolment
        on enrolment.class_id=class.id
        and enrolment.student_id=learner_uuid
        and enrolment.archived_at is null
      join public.user_profiles learner
        on learner.id=enrolment.student_id
        and learner.organisation_id=class.organisation_id
        and learner.role='student'
        and learner.archived_at is null
      where class.id=class_uuid
        and class.archived_at is null
    )
$$;

revoke all on function public.can_read_class_intervention(uuid,uuid) from public,anon;
grant execute on function public.can_read_class_intervention(uuid,uuid) to authenticated;

create or replace function public.enforce_intervention_class_scope()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if not exists(
    select 1
    from public.classes class
    join public.enrolments enrolment
      on enrolment.class_id=class.id
      and enrolment.student_id=new.learner_id
      and enrolment.archived_at is null
    join public.user_profiles learner
      on learner.id=enrolment.student_id
      and learner.organisation_id=class.organisation_id
      and learner.role='student'
      and learner.archived_at is null
    where class.id=new.class_id
      and class.archived_at is null
  ) then
    raise exception 'intervention_scope_mismatch' using errcode='23514';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_intervention_class_scope() from public,anon,authenticated;

drop trigger if exists intervention_class_scope_guard on public.interventions;
create trigger intervention_class_scope_guard
before insert or update of learner_id,class_id on public.interventions
for each row execute function public.enforce_intervention_class_scope();

drop policy if exists interventions_select_teacher on public.interventions;
drop policy if exists interventions_staff_read on public.interventions;

revoke insert,update,delete on public.interventions from authenticated,anon;
grant select on public.interventions to authenticated;

create policy interventions_staff_read
on public.interventions
for select
to authenticated
using (public.can_read_class_intervention(class_id,learner_id));

comment on table public.interventions is
  'Staff-only professional intervention history. New scope is accepted only for an active learner enrolment in the exact class. Reads require management of that class; browser writes are prohibited.';
