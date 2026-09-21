-- Daily missed-practice evidence. Service-role automation writes rows; learners and
-- authorised staff can read them. A row is the red attendance badge for that day.
create table if not exists public.mini_study_practice_misses (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.user_profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  missed_on date not null,
  learner_notified_at timestamptz,
  teacher_notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (learner_id,class_id,missed_on)
);

create index if not exists mini_study_practice_misses_learner_week_idx
  on public.mini_study_practice_misses(learner_id,missed_on desc);
create index if not exists mini_study_practice_misses_class_week_idx
  on public.mini_study_practice_misses(class_id,missed_on desc);

alter table public.mini_study_practice_misses enable row level security;

drop policy if exists mini_study_practice_misses_read on public.mini_study_practice_misses;
create policy mini_study_practice_misses_read on public.mini_study_practice_misses
for select using (
  learner_id=auth.uid() or public.can_access_class(class_id)
);
