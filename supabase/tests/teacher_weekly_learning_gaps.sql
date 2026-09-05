\set ON_ERROR_STOP on

begin;

update public.classes set weekly_learning_day=1
where id='a0000000-0000-0000-0000-000000000001';

create temporary table journey_input(template_id uuid);
insert into journey_input
select template.id from public.learning_journey_templates template
join public.units unit on unit.id=template.unit_id
where unit.code='4' and template.status='approved' limit 1;
grant select on journey_input to authenticated;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
select public.start_group_learning_journey(
  'a0000000-0000-0000-0000-000000000001',
  (select template_id from journey_input)
);
reset role;

update public.group_learning_journeys set started_on='2026-08-24'
where class_id='a0000000-0000-0000-0000-000000000001';

set local role authenticated;
do $$ begin
  if (select overdue_teaching_week from public.class_learner_weekly_gaps(
    'a0000000-0000-0000-0000-000000000001','2026-09-07'
  ) where learner_id='90000000-0000-0000-0000-000000000002')<>1 then
    raise exception 'missing starting point was not escalated';
  end if;
end $$;
reset role;

create temporary table baseline_payload as
select
  pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'id',topic_code||'-q'||question_number,
    'kind','initial_diagnostic','unitCode','4','topicCode',topic_code,
    'skill','Test skill','learningAim','A','criterion','A.P1',
    'difficulty',1,'correct',true,'independent',true,
    'hintsUsed',0,'feedback','Recorded feedback','recordedAt',pg_catalog.now()
  )) evidence,
  pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'questionId',topic_code||'-q'||question_number,'selectedOption',0
  )) responses
from pg_catalog.unnest(array[
  'A1','A2–A3','A4','A5–A6','B1','B2','C1–C2','C3–C5'
]) topic_code
cross join pg_catalog.generate_series(1,3) question_number;

select public.record_unit_starting_point_once(
  '90000000-0000-0000-0000-000000000002','4','Core',24,24,
  (select responses from baseline_payload),(select evidence from baseline_payload),'',''
);

set local role authenticated;
do $$
declare gap record;
begin
  select * into gap from public.class_learner_weekly_gaps(
    'a0000000-0000-0000-0000-000000000001','2026-09-07'
  ) where learner_id='90000000-0000-0000-0000-000000000002';
  if gap.overdue_teaching_week<>2 or gap.topic_code is null then
    raise exception 'the first incomplete learning week was not escalated: %',row_to_json(gap);
  end if;
end $$;
reset role;

update public.learner_curriculum_progress progress set
  mastered_at=pg_catalog.now(),mastery_score=90,independent_attempts=3,
  lesson_completed_at=pg_catalog.now(),practice_score=90,
  evidence=progress.evidence||'[
    {"kind":"topic_mastery","independent":true,"hintsUsed":0},
    {"kind":"topic_mastery","independent":true,"hintsUsed":0},
    {"kind":"topic_mastery","independent":true,"hintsUsed":0}
  ]'::jsonb
where progress.learner_id='90000000-0000-0000-0000-000000000002'
  and progress.unit_code='4'
  and progress.topic_code=(
    select journey_week.configuration->>'topic_code'
    from public.learning_journey_weeks journey_week
    join public.group_learning_journeys journey
      on journey.template_id=journey_week.template_id
    where journey.class_id='a0000000-0000-0000-0000-000000000001'
      and journey_week.teaching_week=2
  );

set local role authenticated;
do $$ begin
  if exists(select 1 from public.class_learner_weekly_gaps(
    'a0000000-0000-0000-0000-000000000001','2026-09-07'
  ) where learner_id='90000000-0000-0000-0000-000000000002') then
    raise exception 'completed prior weeks still generated teacher attention';
  end if;
end $$;
reset role;

select 'teacher weekly learning gaps passed' result;
rollback;
