-- Extend the already-audited adaptive curriculum and append-only evidence model
-- to Hima's Units 10 and 14. Unit 14 remains external-assessment preparation;
-- no portal artifact is represented as Pearson's live set task.

alter table public.learner_curriculum_attempts
  drop constraint if exists learner_curriculum_attempts_unit_code_check;
alter table public.learner_curriculum_attempts
  add constraint learner_curriculum_attempts_unit_code_check
  check(unit_code in ('1','2','4','6','8','9','10','14'));

alter table public.learner_topic_worksheets
  drop constraint if exists learner_topic_worksheets_unit_code_check;
alter table public.learner_topic_worksheets
  add constraint learner_topic_worksheets_unit_code_check
  check(unit_code in ('2','4','6','10','14'));

alter table public.learner_portfolio_artifacts
  drop constraint if exists learner_portfolio_artifacts_unit_code_check;
alter table public.learner_portfolio_artifacts
  add constraint learner_portfolio_artifacts_unit_code_check
  check(unit_code in ('2','4','6','10','14'));

alter table public.learner_catch_up_records
  drop constraint if exists learner_catch_up_records_unit_code_check;
alter table public.learner_catch_up_records
  add constraint learner_catch_up_records_unit_code_check
  check(unit_code in ('2','4','6','10','14'));

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
  if actor.id is null or actor.role<>'student' or unit_code_value not in ('2','4','6','10','14')
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
  if actor.id is null or actor.role<>'student' or unit_code_value not in ('2','4','6','10','14')
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

revoke all on function public.begin_my_topic_catch_up(text,text) from public,anon;
revoke all on function public.submit_my_topic_worksheet(text,text,text,text,jsonb,integer) from public,anon;
grant execute on function public.begin_my_topic_catch_up(text,text) to authenticated;
grant execute on function public.submit_my_topic_worksheet(text,text,text,text,jsonb,integer) to authenticated;

insert into public.learning_journey_templates(
  unit_id,title,total_teaching_weeks,status,source_reference,approved_at
)
select unit.id,unit.title||' — 12 teaching weeks',12,'approved',
  version.source_reference,now()
from public.units unit
join public.courses course on course.id=unit.course_id
left join public.curriculum_versions version
  on version.id=unit.curriculum_version_id and version.active and version.archived_at is null
where unit.code in ('10','14') and unit.archived_at is null
  and (lower(coalesce(course.awarding_organisation,'')) like '%pearson%'
    or lower(course.title) like '%btec%')
on conflict(unit_id,version_number) do update set
  title=excluded.title,total_teaching_weeks=excluded.total_teaching_weeks,
  status='approved',source_reference=excluded.source_reference,
  approved_at=coalesce(public.learning_journey_templates.approved_at,now()),archived_at=null;

insert into public.learning_journey_weeks(template_id,teaching_week,title,milestone)
select template.id,week_number,'Teaching Week '||week_number,
  case week_number when 1 then 'starting_point'
    when 6 then 'progress_check_1'
    when 10 then 'progress_check_2'
    when 12 then 'final' else 'learning' end
from public.learning_journey_templates template
join public.units unit on unit.id=template.unit_id and unit.code in ('10','14')
cross join generate_series(1,12) week_number
where template.status='approved' and template.archived_at is null
on conflict(template_id,teaching_week) do update set
  milestone=excluded.milestone;

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
  union all
  select '10',ordinality::integer,topic_codes[ordinality],titles[ordinality]
  from (values(
    array['A1','A2','A3','A4','B1','B2','B3','C1','C2','C2','C2','C2'],
    array['Business information and starting point','Data types, storage and access','Big-data analysis',
      'Four levels of analytics','Statistical techniques','Progress Check 1: probability',
      'Regression and model fit','Select a defensible dataset','Prepare and analyse data',
      'Progress Check 2: analytics investigation','Audience-led reporting','Final analytics evidence']
  )) unit_ten(topic_codes,titles),generate_subscripts(topic_codes,1) ordinality
  union all
  select '14',ordinality::integer,topic_codes[ordinality],titles[ordinality]
  from (values(
    array['A1','A2–A3','B1–B2','B3–B4','C1–C2','D1','D2','D3','B3–B4','D3','B3–B4','D3'],
    array['Service life cycle and starting point','Organisation and service identification',
      'Define service requirements','Design the IT service solution','Information and data requirements',
      'Progress Check 1: software services','Hardware and connectivity','Manage delivery and change',
      'Integrated service design','Progress Check 2: timed set-task rehearsal',
      'Alternatives and justification','Final external-assessment readiness']
  )) unit_fourteen(topic_codes,titles),generate_subscripts(topic_codes,1) ordinality
)
update public.learning_journey_weeks journey_week set
  title=plan.title,
  configuration=journey_week.configuration||jsonb_build_object(
    'topic_code',plan.topic_code,
    'resource_kind','configured_topic_hub',
    'worksheet_required',true,
    'practical_required',true,
    'knowledge_check_required',true,
    'reflection_required',true,
    'assessment_context',case when plan.unit_code='14' then 'external_set_task_preparation' else 'internal_assessment_evidence' end
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

comment on constraint learner_curriculum_attempts_unit_code_check on public.learner_curriculum_attempts is
  'Audited portal curriculum units, including Hima teaching Units 10 and 14.';
