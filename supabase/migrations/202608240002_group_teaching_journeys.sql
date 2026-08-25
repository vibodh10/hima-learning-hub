-- Shared unit journeys are activated for a group once. Their position is
-- derived from teaching sessions and the organisation calendar; teachers do
-- not enter journey dates or manually pause/resume for holidays.

alter table public.academic_calendar_events
  drop constraint if exists academic_calendar_events_kind_check;
alter table public.academic_calendar_events
  add constraint academic_calendar_events_kind_check check(kind in (
    'holiday','college_closure','non_teaching','teaching_week',
    'progress_point_week','review_week','examination_reminder'
  ));

create table public.learning_journey_templates (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id),
  title text not null,
  version_number integer not null default 1,
  total_teaching_weeks integer not null default 12,
  status text not null default 'draft',
  source_reference text,
  created_by uuid references public.user_profiles(id),
  approved_by uuid references public.user_profiles(id),
  approved_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(unit_id,version_number),
  check(length(trim(title)) between 3 and 160),
  check(version_number>0),
  check(total_teaching_weeks between 1 and 52),
  check(status in ('draft','approved','archived'))
);

create table public.learning_journey_weeks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.learning_journey_templates(id) on delete cascade,
  teaching_week integer not null,
  title text not null,
  topic_id uuid references public.topics(id),
  milestone text not null default 'learning',
  configuration jsonb not null default '{}',
  unique(template_id,teaching_week),
  check(teaching_week between 1 and 52),
  check(length(trim(title)) between 3 and 160),
  check(milestone in ('starting_point','learning','progress_check_1','progress_check_2','final'))
);

create table public.learning_journey_week_lessons (
  journey_week_id uuid not null references public.learning_journey_weeks(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id),
  sequence integer not null default 1,
  required boolean not null default true,
  primary key(journey_week_id,lesson_id),
  unique(journey_week_id,sequence),
  check(sequence>0)
);

create table public.group_learning_journeys (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id),
  template_id uuid not null references public.learning_journey_templates(id),
  unit_id uuid not null references public.units(id),
  status text not null default 'active',
  started_on date not null default current_date,
  started_at timestamptz not null default now(),
  started_by uuid not null references public.user_profiles(id),
  completed_at timestamptz,
  archived_at timestamptz,
  settings jsonb not null default '{}',
  check(status in ('active','completed','cancelled'))
);

create unique index group_learning_journeys_one_active_idx
  on public.group_learning_journeys(class_id) where status='active' and archived_at is null;
create index group_learning_journeys_class_history_idx
  on public.group_learning_journeys(class_id,started_at desc);
create index learning_journey_weeks_template_idx
  on public.learning_journey_weeks(template_id,teaching_week);

alter table public.learning_journey_templates enable row level security;
alter table public.learning_journey_weeks enable row level security;
alter table public.learning_journey_week_lessons enable row level security;
alter table public.group_learning_journeys enable row level security;

grant select on public.learning_journey_templates to authenticated;
grant select on public.learning_journey_weeks to authenticated;
grant select on public.learning_journey_week_lessons to authenticated;
grant select on public.group_learning_journeys to authenticated;

create policy learning_journey_templates_read on public.learning_journey_templates
for select to authenticated using (
  archived_at is null and public.can_access_unit(unit_id)
);
create policy learning_journey_weeks_read on public.learning_journey_weeks
for select to authenticated using (
  exists(select 1 from public.learning_journey_templates template
    where template.id=template_id and template.archived_at is null
      and public.can_access_unit(template.unit_id))
);
create policy learning_journey_week_lessons_read on public.learning_journey_week_lessons
for select to authenticated using (
  exists(select 1 from public.learning_journey_weeks journey_week
    join public.learning_journey_templates template on template.id=journey_week.template_id
    where journey_week.id=journey_week_id and template.archived_at is null
      and public.can_access_unit(template.unit_id))
);
create policy group_learning_journeys_read on public.group_learning_journeys
for select to authenticated using (public.can_access_class(class_id));

create or replace function public.start_group_learning_journey(
  class_uuid uuid,
  template_uuid uuid
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare
  actor public.user_profiles;
  selected_template public.learning_journey_templates;
  current_journey public.group_learning_journeys;
  created_uuid uuid;
begin
  actor:=public.current_profile();
  if actor.id is null or actor.role not in ('teacher','administrator')
    or not public.can_manage_class(class_uuid) then
    raise exception 'not_authorised' using errcode='42501';
  end if;

  select * into selected_template from public.learning_journey_templates
  where id=template_uuid and status='approved' and archived_at is null;
  if selected_template.id is null or not exists(
    select 1 from public.class_units class_unit
    where class_unit.class_id=class_uuid
      and class_unit.unit_id=selected_template.unit_id
      and class_unit.active and class_unit.archived_at is null
  ) then raise exception 'journey_not_available' using errcode='22023';
  end if;

  select * into current_journey from public.group_learning_journeys
  where class_id=class_uuid and status='active' and archived_at is null
  order by started_at desc limit 1;
  if current_journey.id is not null then
    if current_journey.template_id=template_uuid then return current_journey.id; end if;
    raise exception 'journey_already_active' using errcode='23505';
  end if;

  update public.classes set
    active_unit_id=selected_template.unit_id,
    weekly_learning_day=coalesce(weekly_learning_day,extract(isodow from current_date)::integer),
    published=true
  where id=class_uuid;

  insert into public.group_learning_journeys(
    class_id,template_id,unit_id,started_by
  ) values(class_uuid,template_uuid,selected_template.unit_id,actor.id)
  returning id into created_uuid;

  insert into public.audit_logs(
    organisation_id,actor_id,action,entity_type,entity_id,after_data
  ) values(
    actor.organisation_id,actor.id,'group_journey.started','group_learning_journey',created_uuid,
    jsonb_build_object('class_id',class_uuid,'template_id',template_uuid,
      'unit_id',selected_template.unit_id,'total_teaching_weeks',selected_template.total_teaching_weeks)
  );
  return created_uuid;
end;
$$;

create or replace function public.group_learning_journey_position(
  journey_uuid uuid,
  as_of date default current_date
) returns table(
  journey_id uuid,
  class_id uuid,
  unit_id uuid,
  template_id uuid,
  journey_title text,
  position_status text,
  teaching_week integer,
  total_teaching_weeks integer,
  current_week_started_on date,
  next_teaching_on date,
  pause_reason text
)
language plpgsql stable security definer set search_path=''
as $$
declare
  journey public.group_learning_journeys;
  class_record public.classes;
  template public.learning_journey_templates;
  first_session date;
  elapsed integer;
  current_session date;
  next_session date;
  paused_by text;
begin
  select * into journey from public.group_learning_journeys
  where id=journey_uuid and archived_at is null;
  if journey.id is null or not public.can_access_class(journey.class_id) then
    raise exception 'journey_not_available' using errcode='42501';
  end if;
  select * into class_record from public.classes where id=journey.class_id;
  select * into template from public.learning_journey_templates where id=journey.template_id;
  if class_record.weekly_learning_day is null then
    raise exception 'weekly_learning_day_not_configured' using errcode='22023';
  end if;

  first_session:=journey.started_on
    + ((class_record.weekly_learning_day-extract(isodow from journey.started_on)::integer+7)%7);

  select count(*)::integer into elapsed
  from generate_series(first_session::timestamp,as_of::timestamp,interval '7 days') session_on
  where not exists(
    select 1 from public.academic_calendar_events event
    where event.academic_year_id=class_record.academic_year_id
      and event.archived_at is null
      and event.kind in ('holiday','college_closure','non_teaching')
      and session_on::date between event.starts_on and event.ends_on
  );

  if elapsed>0 then
    select session_on::date into current_session
    from generate_series(first_session::timestamp,(first_session+interval '20 years')::timestamp,interval '7 days') session_on
    where not exists(
      select 1 from public.academic_calendar_events event
      where event.academic_year_id=class_record.academic_year_id
        and event.archived_at is null
        and event.kind in ('holiday','college_closure','non_teaching')
        and session_on::date between event.starts_on and event.ends_on
    ) order by session_on offset elapsed-1 limit 1;
  else
    current_session:=journey.started_on;
  end if;

  if elapsed<=template.total_teaching_weeks then
    select session_on::date into next_session
    from generate_series(first_session::timestamp,(first_session+interval '20 years')::timestamp,interval '7 days') session_on
    where not exists(
      select 1 from public.academic_calendar_events event
      where event.academic_year_id=class_record.academic_year_id
        and event.archived_at is null
        and event.kind in ('holiday','college_closure','non_teaching')
        and session_on::date between event.starts_on and event.ends_on
    ) order by session_on offset elapsed limit 1;
  end if;

  select event.title into paused_by from public.academic_calendar_events event
  where event.academic_year_id=class_record.academic_year_id
    and event.archived_at is null
    and event.kind in ('holiday','college_closure','non_teaching')
    and as_of between event.starts_on and event.ends_on
  order by event.starts_on limit 1;

  return query select
    journey.id,journey.class_id,journey.unit_id,journey.template_id,template.title,
    case when elapsed>template.total_teaching_weeks then 'completed'
      when paused_by is not null then 'paused' else 'in_progress' end,
    least(greatest(elapsed,1),template.total_teaching_weeks),
    template.total_teaching_weeks,current_session,
    case when elapsed>template.total_teaching_weeks then null::date else next_session end,
    paused_by;
end;
$$;

create or replace function public.current_class_learning_journey(
  class_uuid uuid,
  as_of date default current_date
) returns table(
  journey_id uuid,class_id uuid,unit_id uuid,template_id uuid,journey_title text,
  position_status text,teaching_week integer,total_teaching_weeks integer,
  current_week_started_on date,next_teaching_on date,pause_reason text
)
language plpgsql stable security definer set search_path=''
as $$
declare active_journey uuid;
begin
  if not public.can_access_class(class_uuid) then
    raise exception 'class_not_available' using errcode='42501';
  end if;
  select group_journey.id into active_journey from public.group_learning_journeys group_journey
  where group_journey.class_id=class_uuid and group_journey.status='active'
    and group_journey.archived_at is null
  order by group_journey.started_at desc limit 1;
  if active_journey is null then return; end if;
  return query select * from public.group_learning_journey_position(active_journey,as_of);
end;
$$;

revoke all on function public.start_group_learning_journey(uuid,uuid) from public,anon;
revoke all on function public.group_learning_journey_position(uuid,date) from public,anon;
revoke all on function public.current_class_learning_journey(uuid,date) from public,anon;
grant execute on function public.start_group_learning_journey(uuid,uuid) to authenticated;
grant execute on function public.group_learning_journey_position(uuid,date) to authenticated;
grant execute on function public.current_class_learning_journey(uuid,date) to authenticated;

insert into public.learning_journey_templates(
  unit_id,title,total_teaching_weeks,status,source_reference,approved_at
)
select unit.id,unit.title||' — 12 teaching weeks',12,'approved',
  version.source_reference,now()
from public.units unit
join public.courses course on course.id=unit.course_id
left join public.curriculum_versions version
  on version.id=unit.curriculum_version_id and version.active and version.archived_at is null
where unit.code in ('2','4','6') and unit.archived_at is null
  and (lower(coalesce(course.awarding_organisation,'')) like '%pearson%'
    or lower(course.title) like '%btec%')
on conflict(unit_id,version_number) do nothing;

insert into public.learning_journey_weeks(template_id,teaching_week,title,milestone)
select template.id,week_number,'Teaching Week '||week_number,
  case week_number when 1 then 'starting_point'
    when 6 then 'progress_check_1'
    when 10 then 'progress_check_2'
    when 12 then 'final' else 'learning' end
from public.learning_journey_templates template
cross join generate_series(1,12) week_number
where template.status='approved' and template.archived_at is null
on conflict(template_id,teaching_week) do nothing;

create or replace function public.seed_initial_learning_journey_weeks()
returns void language sql set search_path=''
as $$
with journey_plan(unit_code,teaching_week,topic_code,title) as (
  select '2',ordinality::integer,topic_codes[ordinality],titles[ordinality]
  from (values(
    array['A1','A2','A3','B1','B2','C1','C1','C2','D1–D3','D1–D3','D1–D3','D1–D3'],
    array['Database systems and starting point','SQL and relational data','Normalisation',
      'Relational database design','Design documentation','Progress Check 1: build a database solution',
      'Forms, queries and reports','Testing and refinement','Evaluate the database project',
      'Progress Check 2: integrated database task','External assessment preparation','Final evidence and readiness']
  )) unit_two(topic_codes,titles),generate_subscripts(topic_codes,1) ordinality
  union all
  select '4',ordinality::integer,topic_codes[ordinality],titles[ordinality]
  from (values(
    array['A1','A2–A3','A4','A5–A6','B1','B2','B2','C1–C2','C1–C2','C3–C5','C3–C5','C3–C5'],
    array['Computational thinking and starting point','Software uses and languages','Programming constructs',
      'Logic and software quality','Software development life cycle','Progress Check 1: software design',
      'Refine the software design','Develop and test software','Debug and improve',
      'Progress Check 2: independent program','Optimisation and review','Final software evidence']
  )) unit_four(topic_codes,titles),generate_subscripts(topic_codes,1) ordinality
  union all
  select '6',ordinality::integer,topic_codes[ordinality],titles[ordinality]
  from (values(
    array['A1','A2','B1','B2','C1','C2','C2','C3–C5','C3–C5','C3–C5','C3–C5','C3–C5'],
    array['Website purpose and starting point','Website performance factors','Website design',
      'Web production techniques','Client-side scripting','Progress Check 1: develop and publish',
      'Responsive implementation','Test and review','Optimise the website',
      'Progress Check 2: independent website task','Professional review','Final website evidence']
  )) unit_six(topic_codes,titles),generate_subscripts(topic_codes,1) ordinality
)
update public.learning_journey_weeks journey_week set
  title=plan.title,
  configuration=journey_week.configuration||jsonb_build_object(
    'topic_code',plan.topic_code,
    'resource_kind','configured_topic_hub',
    'worksheet_required',true,
    'practical_required',true,
    'knowledge_check_required',true,
    'reflection_required',true
  )
from public.learning_journey_templates template
join public.units unit on unit.id=template.unit_id
join journey_plan plan on plan.unit_code=unit.code
where journey_week.template_id=template.id
  and journey_week.teaching_week=plan.teaching_week
  and template.status='approved' and template.archived_at is null;
$$;

revoke all on function public.seed_initial_learning_journey_weeks() from public,anon,authenticated;
select public.seed_initial_learning_journey_weeks();

insert into public.learning_journey_week_lessons(journey_week_id,lesson_id,sequence)
select journey_week.id,lesson.id,
  row_number() over(partition by journey_week.id order by topic.sort_order,lesson.title)::integer
from public.learning_journey_weeks journey_week
join public.learning_journey_templates template on template.id=journey_week.template_id
join public.topics topic on topic.unit_id=template.unit_id and topic.archived_at is null
join public.lessons lesson on lesson.topic_id=topic.id
  and lesson.week_number=journey_week.teaching_week and lesson.archived_at is null
on conflict(journey_week_id,lesson_id) do nothing;

create or replace function public.teacher_save_calendar_event(
  event_uuid uuid,academic_year_uuid uuid,academic_period_uuid uuid,
  title_value text,kind_value text,starts_value date,ends_value date,
  metadata_value jsonb default '{}'::jsonb,archive_value boolean default false
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare
  actor public.user_profiles;
  saved_uuid uuid;
  year_organisation uuid;
begin
  actor:=public.current_profile();
  select organisation_id into year_organisation from public.academic_years
  where id=academic_year_uuid and archived_at is null;
  if actor.id is null or actor.role<>'administrator'
    or year_organisation is distinct from actor.organisation_id then
    raise exception 'calendar_access_denied' using errcode='42501';
  end if;
  if length(trim(title_value))<3
    or kind_value not in ('holiday','college_closure','non_teaching','teaching_week',
      'progress_point_week','review_week','examination_reminder')
    or ends_value<starts_value
    or (academic_period_uuid is not null and not exists(
      select 1 from public.academic_periods period where period.id=academic_period_uuid
        and period.academic_year_id=academic_year_uuid and period.archived_at is null
    )) then raise exception 'invalid_calendar_event' using errcode='22023';
  end if;

  if event_uuid is null then
    insert into public.academic_calendar_events(
      academic_year_id,academic_period_id,title,kind,starts_on,ends_on,
      metadata,created_by,archived_at
    ) values(
      academic_year_uuid,academic_period_uuid,trim(title_value),kind_value,
      starts_value,ends_value,coalesce(metadata_value,'{}'),actor.id,
      case when archive_value then now() else null end
    ) returning id into saved_uuid;
  else
    update public.academic_calendar_events event set
      academic_year_id=academic_year_uuid,academic_period_id=academic_period_uuid,
      title=trim(title_value),kind=kind_value,starts_on=starts_value,
      ends_on=ends_value,metadata=coalesce(metadata_value,'{}'),updated_at=now(),
      archived_at=case when archive_value then coalesce(event.archived_at,now()) else null end
    where event.id=event_uuid and event.academic_year_id in (
      select year.id from public.academic_years year
      where year.organisation_id=actor.organisation_id
    ) returning event.id into saved_uuid;
    if saved_uuid is null then raise exception 'calendar_event_not_found' using errcode='42501'; end if;
  end if;

  insert into public.audit_logs(
    organisation_id,actor_id,action,entity_type,entity_id,after_data
  ) values(
    actor.organisation_id,actor.id,
    case when archive_value then 'calendar_event.archived'
      when event_uuid is null then 'calendar_event.created' else 'calendar_event.updated' end,
    'academic_calendar_event',saved_uuid,
    jsonb_build_object('title',trim(title_value),'kind',kind_value,
      'starts_on',starts_value,'ends_on',ends_value)
  );
  return saved_uuid;
end;
$$;

comment on table public.learning_journey_templates is
  'Versioned curriculum journeys shared by every group using a unit; groups never duplicate curriculum.';
comment on table public.group_learning_journeys is
  'Group activations of shared journeys. Start dates are system-recorded and positions are derived from teaching sessions and non-teaching periods.';
