alter table public.learner_curriculum_attempts
  add column if not exists teacher_mark integer,
  add column if not exists teacher_feedback text,
  add column if not exists reviewed_by uuid references public.user_profiles(id),
  add column if not exists reviewed_at timestamptz;

alter table public.learner_curriculum_attempts
  add constraint learner_curriculum_attempts_teacher_mark_range
  check (teacher_mark is null or (teacher_mark >= 0 and teacher_mark <= max_mark));

comment on column public.learner_curriculum_attempts.teacher_mark is
  'Final teacher-awarded mark for open-ended practical evidence. Null means awaiting review.';

drop policy if exists curriculum_attempts_teacher_update on public.learner_curriculum_attempts;
create policy curriculum_attempts_teacher_update on public.learner_curriculum_attempts for update
  using (
    public.can_access_learner(learner_id)
    and (select role from public.current_profile()) in ('teacher','administrator')
  )
  with check (
    public.can_access_learner(learner_id)
    and (select role from public.current_profile()) in ('teacher','administrator')
  );

grant update on public.learner_curriculum_attempts to authenticated;
