create table if not exists public.learner_curriculum_progress (
  learner_id uuid not null references public.user_profiles(id) on delete cascade,
  unit_code text not null,
  topic_code text not null,
  selected_level text check(selected_level in ('Foundation','Intermediate','Challenge')),
  topic_started_at timestamptz,
  lesson_completed_at timestamptz,
  practice_score numeric check(practice_score between 0 and 100),
  hints_used integer not null default 0 check(hints_used >= 0),
  mastery_score numeric check(mastery_score between 0 and 100),
  mastered_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(learner_id,unit_code,topic_code)
);

alter table public.learner_curriculum_progress enable row level security;

create policy learner_curriculum_progress_select on public.learner_curriculum_progress
for select using(public.can_access_learner(learner_id));

create policy learner_curriculum_progress_insert on public.learner_curriculum_progress
for insert with check(
  learner_id=auth.uid()
  and exists(select 1 from public.current_profile() where role='student')
);

create policy learner_curriculum_progress_update on public.learner_curriculum_progress
for update using(learner_id=auth.uid())
with check(learner_id=auth.uid());

grant select,insert,update on public.learner_curriculum_progress to authenticated;

create or replace function public.prevent_false_curriculum_mastery()
returns trigger language plpgsql set search_path=public,extensions as $$
begin
  if new.mastery_score is not null and (
    new.lesson_completed_at is null or new.practice_score is null
  ) then
    raise exception 'mastery_requires_learning_and_practice' using errcode='23514';
  end if;
  if new.mastered_at is not null and coalesce(new.mastery_score,0)<70 then
    raise exception 'mastered_requires_independent_threshold' using errcode='23514';
  end if;
  new.updated_at:=now();
  return new;
end $$;

drop trigger if exists learner_curriculum_progress_evidence_guard on public.learner_curriculum_progress;
create trigger learner_curriculum_progress_evidence_guard
before insert or update on public.learner_curriculum_progress
for each row execute function public.prevent_false_curriculum_mastery();

