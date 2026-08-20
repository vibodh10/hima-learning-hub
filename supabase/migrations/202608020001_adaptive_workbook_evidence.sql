-- Join the curriculum workbook to the same evidence principles used by the
-- adaptive activity engine. Academic decisions are inspectable and never come
-- from a page view, a badge or a single answer.
alter table public.learner_curriculum_progress
  drop constraint if exists learner_curriculum_progress_selected_level_check;

alter table public.learner_curriculum_progress
  add constraint learner_curriculum_progress_selected_level_check
    check (selected_level in ('Support','Core','Stretch','Challenge')),
  add column if not exists current_section text,
  add column if not exists independent_attempts integer not null default 0 check (independent_attempts >= 0),
  add column if not exists retrieval_due_at timestamptz,
  add column if not exists fast_track_reason text,
  add column if not exists evidence jsonb not null default '[]'::jsonb;

create or replace function public.prevent_false_curriculum_mastery()
returns trigger language plpgsql as $$
declare
  independent_mastery_count integer;
begin
  select count(*) into independent_mastery_count
  from jsonb_array_elements(coalesce(new.evidence,'[]'::jsonb)) item
  where item->>'kind'='topic_mastery'
    and coalesce((item->>'independent')::boolean,false)
    and coalesce((item->>'hintsUsed')::integer,0)=0;

  if new.mastery_score is not null and (
    new.lesson_completed_at is null or new.practice_score is null
    or new.independent_attempts < 3 or independent_mastery_count < 3
  ) then
    raise exception 'mastery_requires_three_independent_attempts' using errcode='23514';
  end if;
  if new.mastered_at is not null and coalesce(new.mastery_score,0)<80 then
    raise exception 'mastered_at_requires_secure_score' using errcode='23514';
  end if;
  if new.fast_track_reason is not null and not exists (
    select 1 from jsonb_array_elements(coalesce(new.evidence,'[]'::jsonb)) item
    where item->>'kind'='initial_diagnostic' and coalesce((item->>'independent')::boolean,false)
  ) then
    raise exception 'fast_track_requires_diagnostic_evidence' using errcode='23514';
  end if;
  return new;
end;
$$;

comment on column public.learner_curriculum_progress.evidence is
  'Mapped academic evidence only. Engagement rewards are deliberately excluded.';
