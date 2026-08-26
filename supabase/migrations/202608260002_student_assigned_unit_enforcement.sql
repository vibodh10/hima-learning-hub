-- Static workbook evidence must remain inside the learner's real, published
-- group allocation even when a client calls PostgREST directly.

create or replace function public.student_has_assigned_unit_code(unit_code_value text)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1
    from public.enrolments enrolment
    join public.classes class on class.id=enrolment.class_id
    join public.class_units assignment on assignment.class_id=class.id
    join public.units unit on unit.id=assignment.unit_id
    where enrolment.student_id=auth.uid()
      and enrolment.archived_at is null
      and class.archived_at is null
      and class.published
      and assignment.archived_at is null
      and assignment.active
      and unit.archived_at is null
      and unit.code=unit_code_value
  )
$$;

drop policy if exists learner_curriculum_progress_insert on public.learner_curriculum_progress;
create policy learner_curriculum_progress_insert on public.learner_curriculum_progress
for insert with check(
  learner_id=auth.uid()
  and exists(select 1 from public.current_profile() where role='student')
  and public.student_has_assigned_unit_code(unit_code)
);

drop policy if exists learner_curriculum_progress_update on public.learner_curriculum_progress;
create policy learner_curriculum_progress_update on public.learner_curriculum_progress
for update using(
  learner_id=auth.uid()
  and public.student_has_assigned_unit_code(unit_code)
)
with check(
  learner_id=auth.uid()
  and public.student_has_assigned_unit_code(unit_code)
);

drop policy if exists curriculum_attempts_insert on public.learner_curriculum_attempts;
create policy curriculum_attempts_insert on public.learner_curriculum_attempts
for insert with check(
  learner_id=auth.uid()
  and public.student_has_assigned_unit_code(unit_code)
);

revoke all on function public.student_has_assigned_unit_code(text) from public;
grant execute on function public.student_has_assigned_unit_code(text) to authenticated;

comment on function public.student_has_assigned_unit_code(text) is
  'True only when the current student has an active enrolment in a published group containing the requested active unit code.';
