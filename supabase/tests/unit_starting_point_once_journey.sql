\set ON_ERROR_STOP on

create temporary table baseline_payload as
select
  pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'id',topic_code||'-q'||question_number,
    'kind','initial_diagnostic','unitCode','4','topicCode',topic_code,
    'skill','Test skill','learningAim','A','criterion','A.P1',
    'difficulty',1,'correct',question_number=1,'independent',true,
    'hintsUsed',0,'feedback','Recorded feedback','recordedAt',pg_catalog.now()
  )) evidence,
  pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'questionId',topic_code||'-q'||question_number,'selectedOption',0
  )) responses
from pg_catalog.unnest(array[
  'A1','A2–A3','A4','A5–A6','B1','B2','C1–C2','C3–C5'
]) topic_code
cross join pg_catalog.generate_series(1,3) question_number;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set role authenticated;
do $$ begin
  begin
    perform public.record_unit_starting_point_once(
      auth.uid(),'4','Support',8,24,
      (select responses from baseline_payload),(select evidence from baseline_payload),'',''
    );
    raise exception 'student called the service-only baseline writer';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select public.record_unit_starting_point_once(
  '90000000-0000-0000-0000-000000000002','4','Support',8,24,
  (select responses from baseline_payload),(select evidence from baseline_payload),
  'Some previous coding','No support need supplied'
);

do $$ begin
  if (select count(*) from public.unit_starting_point_baselines
    where learner_id='90000000-0000-0000-0000-000000000002' and unit_code='4')<>1
  then raise exception 'one immutable baseline was not recorded';end if;
  if (select count(*) from public.learner_curriculum_progress
    where learner_id='90000000-0000-0000-0000-000000000002' and unit_code='4')<>8
  then raise exception 'topic starting evidence was not projected';end if;
  if exists(
    select 1 from public.learner_curriculum_progress progress
    where progress.learner_id='90000000-0000-0000-0000-000000000002'
      and progress.unit_code='4'
      and pg_catalog.jsonb_array_length(progress.evidence)<>3
  ) then raise exception 'each topic does not contain three starting responses';end if;
  if not exists(select 1 from public.audit_logs
    where action='unit_starting_point.recorded'
      and entity_type='unit_starting_point_baseline')
  then raise exception 'baseline creation was not audited';end if;
  begin
    perform public.record_unit_starting_point_once(
      '90000000-0000-0000-0000-000000000002','4','Challenge',24,24,
      (select responses from baseline_payload),(select evidence from baseline_payload),'Changed','Changed'
    );
    raise exception 'starting point was overwritten';
  exception when unique_violation then null;
  end;
  if (select recommended_level from public.unit_starting_point_baselines
    where learner_id='90000000-0000-0000-0000-000000000002' and unit_code='4')<>'Support'
  then raise exception 'the original baseline changed';end if;
end $$;

select 'one-time unit starting point journey passed' result;
