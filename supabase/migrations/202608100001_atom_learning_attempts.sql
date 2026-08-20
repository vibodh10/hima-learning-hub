create table if not exists public.learner_curriculum_attempts (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.user_profiles(id) on delete cascade,
  kind text not null check (kind in ('topic_practice','practice_paper')),
  unit_code text not null check (unit_code in ('1','2','4','6','8','9')),
  topic_code text,
  paper_mode text check (paper_mode in ('knowledge','applied','assignment')),
  selected_level text check (selected_level in ('Support','Core','Stretch','Challenge')),
  percentage numeric(5,2) not null check (percentage between 0 and 100),
  mark integer not null default 0 check (mark >= 0),
  max_mark integer not null default 0 check (max_mark >= 0),
  hints_used integer not null default 0 check (hints_used >= 0),
  active_seconds integer not null default 0 check (active_seconds >= 0),
  question_results jsonb not null default '[]'::jsonb,
  completed_at timestamptz not null default now(),
  constraint curriculum_attempt_topic_scope check (
    (kind='topic_practice' and topic_code is not null and paper_mode is null) or
    (kind='practice_paper' and topic_code is null and paper_mode is not null)
  )
);

create index if not exists curriculum_attempts_learner_date_idx
  on public.learner_curriculum_attempts(learner_id,completed_at desc);
create index if not exists curriculum_attempts_topic_idx
  on public.learner_curriculum_attempts(learner_id,unit_code,topic_code,completed_at desc);

alter table public.learner_curriculum_attempts enable row level security;
drop policy if exists curriculum_attempts_read on public.learner_curriculum_attempts;
create policy curriculum_attempts_read on public.learner_curriculum_attempts for select
  using (public.can_access_learner(learner_id));
drop policy if exists curriculum_attempts_insert on public.learner_curriculum_attempts;
create policy curriculum_attempts_insert on public.learner_curriculum_attempts for insert
  with check (learner_id=auth.uid());

grant select,insert on public.learner_curriculum_attempts to authenticated;

comment on table public.learner_curriculum_attempts is
  'Question-level evidence from Atom-style curriculum practice sessions and mixed-topic papers.';
