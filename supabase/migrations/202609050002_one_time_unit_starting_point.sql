-- Preserve one immutable unit baseline. The trusted server action grades the
-- fixed question set; this service-only function records it transactionally.

create table if not exists public.unit_starting_point_baselines (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  learner_id uuid not null references public.user_profiles(id) on delete cascade,
  unit_id uuid not null references public.units(id),
  unit_code text not null,
  recommended_level text not null
    check(recommended_level in ('Support','Core','Stretch','Challenge')),
  correct_count integer not null check(correct_count>=0),
  question_count integer not null check(question_count>0),
  percentage numeric(5,2) not null check(percentage between 0 and 100),
  responses jsonb not null check(jsonb_typeof(responses)='array'),
  evidence jsonb not null check(jsonb_typeof(evidence)='array'),
  completed_at timestamptz not null default now(),
  unique(learner_id,unit_id),
  check(correct_count<=question_count)
);

create index if not exists unit_starting_point_baseline_learner_idx
  on public.unit_starting_point_baselines(learner_id,completed_at desc);

alter table public.unit_starting_point_baselines enable row level security;
create policy unit_starting_point_baseline_read
on public.unit_starting_point_baselines for select to authenticated
using(public.can_access_learner(learner_id));

grant select on public.unit_starting_point_baselines to authenticated;
revoke insert,update,delete on public.unit_starting_point_baselines from authenticated;

create or replace function public.record_unit_starting_point_once(
  learner_uuid uuid,
  unit_code_value text,
  recommended_level_value text,
  correct_count_value integer,
  question_count_value integer,
  responses_value jsonb,
  evidence_value jsonb,
  experience_value text,
  support_needs_value text
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare
  learner public.user_profiles;
  assigned_unit public.units;
  baseline_uuid uuid;
  topic_row record;
begin
  select * into learner from public.user_profiles
  where id=learner_uuid and role='student' and archived_at is null;
  if learner.id is null then
    raise exception 'student_not_available' using errcode='42501';
  end if;

  select unit.* into assigned_unit
  from public.enrolments enrolment
  join public.classes class on class.id=enrolment.class_id
    and class.archived_at is null and class.published
  join public.class_units class_unit on class_unit.class_id=class.id
    and class_unit.active and class_unit.archived_at is null
  join public.units unit on unit.id=class_unit.unit_id and unit.archived_at is null
  where enrolment.student_id=learner_uuid and enrolment.archived_at is null
    and unit.code=unit_code_value
  order by enrolment.enrolled_at desc
  limit 1;
  if assigned_unit.id is null then
    raise exception 'unit_not_assigned' using errcode='42501';
  end if;

  if recommended_level_value not in ('Support','Core','Stretch','Challenge')
    or question_count_value<=0
    or correct_count_value<0
    or correct_count_value>question_count_value
    or pg_catalog.jsonb_typeof(responses_value)<>'array'
    or pg_catalog.jsonb_typeof(evidence_value)<>'array'
    or pg_catalog.jsonb_array_length(responses_value)<>question_count_value
    or pg_catalog.jsonb_array_length(evidence_value)<>question_count_value
    or exists(
      select 1 from pg_catalog.jsonb_array_elements(evidence_value) item
      where item->>'kind'<>'initial_diagnostic'
        or item->>'unitCode'<>unit_code_value
        or coalesce(item->>'topicCode','')=''
        or coalesce((item->>'independent')::boolean,false) is not true
        or coalesce((item->>'hintsUsed')::integer,0)<>0
    )
  then
    raise exception 'invalid_starting_point_evidence' using errcode='22023';
  end if;

  if exists(
    select 1 from public.learner_curriculum_progress progress,
      lateral pg_catalog.jsonb_array_elements(progress.evidence) item
    where progress.learner_id=learner_uuid
      and progress.unit_code=unit_code_value
      and item->>'kind'='initial_diagnostic'
  ) then
    raise exception 'starting_point_already_recorded' using errcode='23505';
  end if;

  insert into public.unit_starting_point_baselines(
    organisation_id,learner_id,unit_id,unit_code,recommended_level,
    correct_count,question_count,percentage,responses,evidence
  ) values(
    learner.organisation_id,learner.id,assigned_unit.id,assigned_unit.code,
    recommended_level_value,correct_count_value,question_count_value,
    pg_catalog.round(correct_count_value::numeric/question_count_value*100,2),
    responses_value,evidence_value
  ) returning id into baseline_uuid;

  for topic_row in
    select item->>'topicCode' topic_code,pg_catalog.jsonb_agg(item) evidence
    from pg_catalog.jsonb_array_elements(evidence_value) item
    group by item->>'topicCode'
  loop
    insert into public.learner_curriculum_progress(
      learner_id,unit_code,topic_code,selected_level,topic_started_at,
      independent_attempts,evidence
    ) values(
      learner.id,assigned_unit.code,topic_row.topic_code,
      recommended_level_value,pg_catalog.now(),0,topic_row.evidence
    )
    on conflict(learner_id,unit_code,topic_code) do update set
      selected_level=excluded.selected_level,
      topic_started_at=coalesce(public.learner_curriculum_progress.topic_started_at,excluded.topic_started_at),
      evidence=coalesce((
        select pg_catalog.jsonb_agg(existing_item)
        from pg_catalog.jsonb_array_elements(public.learner_curriculum_progress.evidence) existing_item
        where existing_item->>'kind'<>'initial_diagnostic'
      ),'[]'::jsonb)||excluded.evidence,
      updated_at=pg_catalog.now();
  end loop;

  insert into public.learner_workbook_background(
    learner_id,experience,support_needs,updated_at
  ) values(
    learner.id,nullif(pg_catalog.btrim(experience_value),''),
    nullif(pg_catalog.btrim(support_needs_value),''),pg_catalog.now()
  )
  on conflict(learner_id) do update set
    experience=excluded.experience,support_needs=excluded.support_needs,
    updated_at=excluded.updated_at;

  insert into public.audit_logs(
    organisation_id,actor_id,action,entity_type,entity_id,after_data
  ) values(
    learner.organisation_id,learner.id,'unit_starting_point.recorded',
    'unit_starting_point_baseline',baseline_uuid,
    pg_catalog.jsonb_build_object(
      'unit_id',assigned_unit.id,'unit_code',assigned_unit.code,
      'correct_count',correct_count_value,'question_count',question_count_value,
      'recommended_level',recommended_level_value
    )
  );

  return baseline_uuid;
exception when unique_violation then
  raise exception 'starting_point_already_recorded' using errcode='23505';
end;
$$;

revoke all on function public.record_unit_starting_point_once(
  uuid,text,text,integer,integer,jsonb,jsonb,text,text
) from public,anon,authenticated;
grant execute on function public.record_unit_starting_point_once(
  uuid,text,text,integer,integer,jsonb,jsonb,text,text
) to service_role;

comment on table public.unit_starting_point_baselines is
  'One immutable, server-graded starting baseline per learner and assigned unit. Later checks must be recorded as progress points.';
