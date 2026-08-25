-- Append-only in-portal worksheets, reflections, portfolio artefacts and
-- teaching-week-based catch-up. Static curriculum topic keys are retained so
-- the existing Units 2/4/6 workbook can migrate without losing evidence.

create table public.learner_topic_worksheets (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.user_profiles(id),
  class_id uuid not null references public.classes(id),
  unit_code text not null,
  topic_code text not null,
  attempt_number integer not null,
  mode text not null default 'standard',
  evidence_stage text not null default 'learning',
  responses jsonb not null,
  confidence integer not null,
  submitted_at timestamptz not null default now(),
  previous_version_id uuid references public.learner_topic_worksheets(id),
  unique(learner_id,class_id,unit_code,topic_code,attempt_number),
  check(unit_code in ('2','4','6')),
  check(length(trim(topic_code)) between 1 and 40),
  check(attempt_number>0),
  check(mode in ('standard','catch_up','improvement')),
  check(evidence_stage in ('before','learning','progress_check_1','progress_check_2','after','improvement')),
  check(jsonb_typeof(responses)='object'),
  check(confidence between 1 and 5)
);

create table public.learner_portfolio_artifacts (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.user_profiles(id),
  class_id uuid not null references public.classes(id),
  unit_code text not null,
  topic_code text,
  stage text not null,
  title text not null,
  source_type text not null,
  source_id uuid,
  version_number integer not null default 1,
  evidence jsonb not null default '{}',
  recorded_at timestamptz not null default now(),
  supersedes_id uuid references public.learner_portfolio_artifacts(id),
  check(unit_code in ('2','4','6')),
  check(stage in ('starting_point','before','learning','practice','checking','improvement',
    'progress_check','after','assessment_preparation','reflection','achievement')),
  check(length(trim(title)) between 3 and 200),
  check(version_number>0),
  check(jsonb_typeof(evidence)='object')
);

create table public.catch_up_policies (
  organisation_id uuid primary key references public.organisations(id),
  reminder_after_teaching_weeks integer not null default 1,
  required_after_teaching_weeks integer not null default 2,
  action_after_teaching_weeks integer not null default 3,
  intervention_after_teaching_weeks integer not null default 4,
  updated_by uuid references public.user_profiles(id),
  updated_at timestamptz not null default now(),
  check(reminder_after_teaching_weeks>=0),
  check(required_after_teaching_weeks>=reminder_after_teaching_weeks),
  check(action_after_teaching_weeks>=required_after_teaching_weeks),
  check(intervention_after_teaching_weeks>=action_after_teaching_weeks)
);

create table public.learner_catch_up_records (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.user_profiles(id),
  class_id uuid not null references public.classes(id),
  journey_id uuid not null references public.group_learning_journeys(id),
  unit_code text not null,
  topic_code text not null,
  source text not null,
  opened_teaching_week integer not null,
  opened_at timestamptz not null default now(),
  completed_at timestamptz,
  completion_worksheet_id uuid references public.learner_topic_worksheets(id),
  check(unit_code in ('2','4','6')),
  check(source in ('self_reported','attendance_integration')),
  check(opened_teaching_week between 1 and 52)
);
create unique index learner_catch_up_one_open_idx
  on public.learner_catch_up_records(learner_id,class_id,unit_code,topic_code)
  where completed_at is null;

create table public.learner_catch_up_events (
  id bigint generated always as identity primary key,
  catch_up_id uuid not null references public.learner_catch_up_records(id) on delete cascade,
  status text not null,
  source text not null,
  evidence jsonb not null default '{}',
  occurred_at timestamptz not null default now(),
  check(status in ('available','in_progress','completed','reminder','catch_up_required','action_required','intervention_required'))
);

create table public.attendance_provider_connections (
  organisation_id uuid primary key references public.organisations(id),
  provider_name text not null,
  connection_status text not null default 'not_configured',
  last_import_at timestamptz,
  configuration jsonb not null default '{}',
  updated_by uuid references public.user_profiles(id),
  updated_at timestamptz not null default now(),
  check(connection_status in ('not_configured','connected','paused','error'))
);

create table public.attendance_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  provider_event_id text not null,
  learner_id uuid not null references public.user_profiles(id),
  class_id uuid not null references public.classes(id),
  session_on date not null,
  attendance_status text not null,
  provider_name text not null,
  imported_at timestamptz not null default now(),
  evidence jsonb not null default '{}',
  unique(organisation_id,provider_name,provider_event_id),
  check(attendance_status in ('present','absent','authorised_absence','late','unavailable'))
);

create index portfolio_learner_date_idx on public.learner_portfolio_artifacts(learner_id,recorded_at desc);
create index worksheet_learner_topic_idx on public.learner_topic_worksheets(learner_id,unit_code,topic_code,submitted_at desc);
create index catch_up_learner_open_idx on public.learner_catch_up_records(learner_id,opened_at desc) where completed_at is null;

alter table public.learner_topic_worksheets enable row level security;
alter table public.learner_portfolio_artifacts enable row level security;
alter table public.catch_up_policies enable row level security;
alter table public.learner_catch_up_records enable row level security;
alter table public.learner_catch_up_events enable row level security;
alter table public.attendance_provider_connections enable row level security;
alter table public.attendance_events enable row level security;

grant select on public.learner_topic_worksheets to authenticated;
grant select on public.learner_portfolio_artifacts to authenticated;
grant select on public.catch_up_policies to authenticated;
grant select on public.learner_catch_up_records to authenticated;
grant select on public.learner_catch_up_events to authenticated;
grant select on public.attendance_provider_connections to authenticated;
grant select on public.attendance_events to authenticated;

create policy learner_topic_worksheets_read on public.learner_topic_worksheets
for select to authenticated using(public.can_access_learner(learner_id));
create policy learner_portfolio_artifacts_read on public.learner_portfolio_artifacts
for select to authenticated using(public.can_access_learner(learner_id));
create policy catch_up_policies_read on public.catch_up_policies
for select to authenticated using(organisation_id=(select organisation_id from public.current_profile()));
create policy learner_catch_up_records_read on public.learner_catch_up_records
for select to authenticated using(public.can_access_learner(learner_id));
create policy learner_catch_up_events_read on public.learner_catch_up_events
for select to authenticated using(exists(
  select 1 from public.learner_catch_up_records catch_up
  where catch_up.id=catch_up_id and public.can_access_learner(catch_up.learner_id)
));
create policy attendance_provider_admin_read on public.attendance_provider_connections
for select to authenticated using(
  organisation_id=(select organisation_id from public.current_profile()) and public.is_admin()
);
create policy attendance_events_read on public.attendance_events
for select to authenticated using(public.can_access_learner(learner_id));

create or replace function public.reject_immutable_learner_artifact_mutation()
returns trigger language plpgsql set search_path=''
as $$ begin
  raise exception 'learner_evidence_is_append_only' using errcode='55000';
end $$;
create trigger topic_worksheets_immutable
before update or delete on public.learner_topic_worksheets
for each row execute function public.reject_immutable_learner_artifact_mutation();
create trigger portfolio_artifacts_immutable
before update or delete on public.learner_portfolio_artifacts
for each row execute function public.reject_immutable_learner_artifact_mutation();

create or replace function public.begin_my_topic_catch_up(
  unit_code_value text,
  topic_code_value text
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare
  actor public.user_profiles;
  enrolment_record record;
  journey_position record;
  existing_uuid uuid;
  created_uuid uuid;
begin
  actor:=public.current_profile();
  if actor.id is null or actor.role<>'student' or unit_code_value not in ('2','4','6')
    or length(trim(topic_code_value)) not between 1 and 40 then
    raise exception 'catch_up_not_available' using errcode='42501';
  end if;
  select enrolment.class_id,journey.id as journey_id into enrolment_record
  from public.enrolments enrolment
  join public.classes class on class.id=enrolment.class_id and class.archived_at is null and class.published
  join public.group_learning_journeys journey on journey.class_id=class.id
    and journey.status='active' and journey.archived_at is null
  join public.units unit on unit.id=journey.unit_id and unit.code=unit_code_value
  where enrolment.student_id=actor.id and enrolment.archived_at is null
  order by journey.started_at desc limit 1;
  if enrolment_record.class_id is null then raise exception 'catch_up_not_available' using errcode='42501'; end if;

  select id into existing_uuid from public.learner_catch_up_records
  where learner_id=actor.id and class_id=enrolment_record.class_id
    and unit_code=unit_code_value and topic_code=trim(topic_code_value)
    and completed_at is null limit 1;
  if existing_uuid is not null then return existing_uuid; end if;

  select * into journey_position from public.current_class_learning_journey(enrolment_record.class_id,current_date);
  insert into public.learner_catch_up_records(
    learner_id,class_id,journey_id,unit_code,topic_code,source,opened_teaching_week
  ) values(
    actor.id,enrolment_record.class_id,enrolment_record.journey_id,
    unit_code_value,trim(topic_code_value),'self_reported',journey_position.teaching_week
  ) returning id into created_uuid;
  insert into public.learner_catch_up_events(catch_up_id,status,source)
  values(created_uuid,'in_progress','learner');
  return created_uuid;
end;
$$;

create or replace function public.submit_my_topic_worksheet(
  unit_code_value text,
  topic_code_value text,
  mode_value text,
  milestone_value text,
  responses_value jsonb,
  confidence_value integer
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare
  actor public.user_profiles;
  class_uuid uuid;
  previous_worksheet uuid;
  next_attempt integer;
  worksheet_uuid uuid;
  portfolio_uuid uuid;
  catch_up_uuid uuid;
  journey_position record;
  effective_milestone text;
begin
  actor:=public.current_profile();
  if actor.id is null or actor.role<>'student' or unit_code_value not in ('2','4','6')
    or length(trim(topic_code_value)) not between 1 and 40
    or mode_value not in ('standard','catch_up','improvement')
    or milestone_value not in ('before','learning','progress_check_1','progress_check_2','after')
    or jsonb_typeof(responses_value)<>'object' or confidence_value not between 1 and 5 then
    raise exception 'invalid_worksheet' using errcode='22023';
  end if;
  select enrolment.class_id into class_uuid from public.enrolments enrolment
  join public.classes class on class.id=enrolment.class_id and class.archived_at is null and class.published
  join public.group_learning_journeys journey on journey.class_id=class.id
    and journey.status='active' and journey.archived_at is null
  join public.units unit on unit.id=journey.unit_id and unit.code=unit_code_value
  where enrolment.student_id=actor.id and enrolment.archived_at is null
  order by enrolment.enrolled_at desc limit 1;
  if class_uuid is null then raise exception 'worksheet_not_available' using errcode='42501'; end if;

  select * into journey_position from public.current_class_learning_journey(class_uuid,current_date);
  effective_milestone:=case when mode_value='improvement' then 'improvement'
    when mode_value='catch_up' then 'learning' else milestone_value end;
  if (effective_milestone='before' and journey_position.teaching_week<>1)
    or (effective_milestone='progress_check_1' and journey_position.teaching_week<6)
    or (effective_milestone='progress_check_2' and journey_position.teaching_week<10)
    or (effective_milestone='after' and journey_position.teaching_week<12) then
    raise exception 'milestone_not_available' using errcode='22023';
  end if;

  select worksheet.id,worksheet.attempt_number into previous_worksheet,next_attempt
  from public.learner_topic_worksheets worksheet
  where worksheet.learner_id=actor.id and worksheet.class_id=class_uuid
    and worksheet.unit_code=unit_code_value and worksheet.topic_code=trim(topic_code_value)
  order by worksheet.attempt_number desc limit 1;
  next_attempt:=coalesce(next_attempt,0)+1;
  insert into public.learner_topic_worksheets(
    learner_id,class_id,unit_code,topic_code,attempt_number,mode,evidence_stage,responses,
    confidence,previous_version_id
  ) values(
    actor.id,class_uuid,unit_code_value,trim(topic_code_value),next_attempt,
    mode_value,effective_milestone,responses_value,confidence_value,previous_worksheet
  ) returning id into worksheet_uuid;

  insert into public.learner_portfolio_artifacts(
    learner_id,class_id,unit_code,topic_code,stage,title,source_type,
    source_id,version_number,evidence
  ) values(
    actor.id,class_uuid,unit_code_value,trim(topic_code_value),
    case when effective_milestone in ('progress_check_1','progress_check_2') then 'progress_check'
      else effective_milestone end,
    'Unit '||unit_code_value||' · '||trim(topic_code_value)||' · '
      ||replace(effective_milestone,'_',' ')||' worksheet',
    'topic_worksheet',worksheet_uuid,next_attempt,
    jsonb_build_object('mode',mode_value,'confidence',confidence_value,'milestone',effective_milestone)
  ) returning id into portfolio_uuid;

  if mode_value='catch_up' then
    select id into catch_up_uuid from public.learner_catch_up_records
    where learner_id=actor.id and class_id=class_uuid and unit_code=unit_code_value
      and topic_code=trim(topic_code_value) and completed_at is null limit 1;
    if catch_up_uuid is not null then
      update public.learner_catch_up_records set completed_at=now(),completion_worksheet_id=worksheet_uuid
      where id=catch_up_uuid;
      insert into public.learner_catch_up_events(catch_up_id,status,source,evidence)
      values(catch_up_uuid,'completed','worksheet',jsonb_build_object('worksheet_id',worksheet_uuid));
    end if;
  end if;
  return worksheet_uuid;
end;
$$;

create or replace function public.my_catch_up_status()
returns table(
  catch_up_id uuid,class_id uuid,unit_code text,topic_code text,opened_at timestamptz,
  completed_at timestamptz,status text,opened_teaching_week integer,current_teaching_week integer
)
language plpgsql stable security definer set search_path=''
as $$
begin
  if (select role from public.current_profile())<>'student' then
    raise exception 'student_access_required' using errcode='42501';
  end if;
  return query
  select catch_up.id,catch_up.class_id,catch_up.unit_code,catch_up.topic_code,
    catch_up.opened_at,catch_up.completed_at,
    case when catch_up.completed_at is not null then 'completed'
      when position.teaching_week-catch_up.opened_teaching_week>=policy.intervention_after_teaching_weeks then 'intervention_required'
      when position.teaching_week-catch_up.opened_teaching_week>=policy.action_after_teaching_weeks then 'action_required'
      when position.teaching_week-catch_up.opened_teaching_week>=policy.required_after_teaching_weeks then 'catch_up_required'
      when position.teaching_week-catch_up.opened_teaching_week>=policy.reminder_after_teaching_weeks then 'reminder'
      else 'in_progress' end,
    catch_up.opened_teaching_week,position.teaching_week
  from public.learner_catch_up_records catch_up
  join public.classes class on class.id=catch_up.class_id
  join public.catch_up_policies policy on policy.organisation_id=class.organisation_id
  cross join lateral public.current_class_learning_journey(catch_up.class_id,current_date) position
  where catch_up.learner_id=auth.uid()
  order by catch_up.opened_at desc;
end;
$$;

revoke all on function public.begin_my_topic_catch_up(text,text) from public,anon;
revoke all on function public.submit_my_topic_worksheet(text,text,text,text,jsonb,integer) from public,anon;
revoke all on function public.my_catch_up_status() from public,anon;
grant execute on function public.begin_my_topic_catch_up(text,text) to authenticated;
grant execute on function public.submit_my_topic_worksheet(text,text,text,text,jsonb,integer) to authenticated;
grant execute on function public.my_catch_up_status() to authenticated;

insert into public.catch_up_policies(organisation_id)
select id from public.organisations on conflict(organisation_id) do nothing;

comment on table public.learner_topic_worksheets is
  'Append-only in-portal worksheet submissions. A later submission creates a new version and never overwrites the original.';
comment on table public.attendance_provider_connections is
  'Administrator-owned integration point; teachers are not asked to maintain attendance manually.';
