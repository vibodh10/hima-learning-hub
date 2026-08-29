-- Academic progress and marks are written only by authenticated server actions
-- after reconstructing the approved curriculum and checking the actor's scope.
-- Learners and teachers retain their existing RLS-scoped read access.

revoke insert, update, delete on public.learner_curriculum_progress from authenticated;
drop policy if exists learner_curriculum_progress_insert on public.learner_curriculum_progress;
drop policy if exists learner_curriculum_progress_update on public.learner_curriculum_progress;

revoke insert, update, delete on public.learner_curriculum_attempts from authenticated;
drop policy if exists curriculum_attempts_insert on public.learner_curriculum_attempts;
drop policy if exists curriculum_attempts_teacher_update on public.learner_curriculum_attempts;

comment on table public.learner_curriculum_progress is
  'Server-authored curriculum route and evidence state. Authenticated clients have RLS-scoped read access only.';
comment on table public.learner_curriculum_attempts is
  'Server-graded curriculum attempts. Authenticated clients have RLS-scoped read access only.';
