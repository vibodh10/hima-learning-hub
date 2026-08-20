\set ON_ERROR_STOP on

do $$
begin
  if (select count(*) from public.units where course_id='30000000-0000-0000-0000-000000000001'
      and archived_at is null)<>21 then
    raise exception 'BTEC catalogue is not complete';
  end if;
  if (select count(*) from public.units where course_id='30000000-0000-0000-0000-000000000002'
      and kind='content_area' and archived_at is null)<>8 then
    raise exception 'T Level core catalogue is not complete';
  end if;
  if not exists(select 1 from public.units where course_id='30000000-0000-0000-0000-000000000002'
      and kind='occupational_specialism' and title='Digital Software Development') then
    raise exception 'T Level occupational specialism is missing';
  end if;
  if (select count(*) from public.classes where name like 'Group %' and archived_at is null)<5 then
    raise exception 'five editable starter groups are missing';
  end if;
end $$;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set role authenticated;

select public.teacher_configure_class(
  'a0000000-0000-0000-0000-000000000001','Configured Pilot Group',
  '21000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  array[
    '40000000-0000-0000-0000-000000000002'::uuid,
    '40000000-0000-0000-0000-000000000004'::uuid
  ],
  '40000000-0000-0000-0000-000000000004',
  '2026-09-01','2027-07-31',2,true
);

select public.teacher_record_action(
  'a0000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000002',
  'additional practice allocated',
  'Python input conversion needs another equivalent practice.',
  current_date+7,'','{"skill":"input-conversion"}'
);

reset role;

insert into public.assessment_blueprints(
  id,curriculum_version_id,unit_id,title,scope,status
) values(
  'b1000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000004',
  'Python unit starting point','unit_starting_point','approved'
);
insert into public.assessment_instances(
  id,learner_id,class_id,blueprint_id,kind,completed_at,confidence_before,prior_experience
) values(
  'b2000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001',
  'unit_starting_point',now(),2,'{"programming":"beginner"}'
);
insert into public.assessment_skill_results(
  id,assessment_instance_id,skill_id,question_type,difficulty,mark,max_mark,
  percentage,hints_used,active_seconds,first_attempt,equivalent_evidence
) values(
  'b3000000-0000-0000-0000-000000000001',
  'b2000000-0000-0000-0000-000000000001',
  '52000000-0000-0000-0000-000000000003',
  'code_output','Core',1,4,25,0,90,true,false
);

do $$
begin
  if (select count(*) from public.class_units where class_id='a0000000-0000-0000-0000-000000000001'
      and active and archived_at is null)<>2 then
    raise exception 'multi-unit class selection failed';
  end if;
  if (select active_unit_id from public.classes where id='a0000000-0000-0000-0000-000000000001')
      <>'40000000-0000-0000-0000-000000000004' then
    raise exception 'active unit selection failed';
  end if;
  if not exists(select 1 from public.teacher_actions
      where learner_id='90000000-0000-0000-0000-000000000002') then
    raise exception 'teacher action was not stored';
  end if;
  if not exists(select 1 from public.assessment_instances
      where id='b2000000-0000-0000-0000-000000000001'
        and kind='unit_starting_point' and immutable) then
    raise exception 'original starting-point evidence was not preserved';
  end if;
end $$;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set role authenticated;
select public.submit_activity(
  '72000000-0000-0000-0000-000000000002',
  '{
    "81000000-0000-0000-0000-000000000025":"7",
    "81000000-0000-0000-0000-000000000026":"str, int, float",
    "81000000-0000-0000-0000-000000000027":"distance = float(input(\"Distance: \"))",
    "81000000-0000-0000-0000-000000000028":"7.0",
    "81000000-0000-0000-0000-000000000029":"logic error"
  }'::jsonb,0
);
reset role;

do $$
begin
  if not exists(select 1 from public.assessment_instances
      where learner_id='90000000-0000-0000-0000-000000000002'
        and kind='unit_starting_point' and attempt_id is not null) then
    raise exception 'submission did not capture permanent starting-point evidence';
  end if;
  if (select count(*) from public.assessment_skill_results r
      join public.assessment_instances i on i.id=r.assessment_instance_id
      where i.kind='unit_starting_point'
        and i.learner_id='90000000-0000-0000-0000-000000000002'
        and i.attempt_id is not null)<>5 then
    raise exception 'starting point was not calculated by skill';
  end if;
  if not exists(select 1 from public.learner_routes
      where learner_id='90000000-0000-0000-0000-000000000002'
        and topic_id='51000000-0000-0000-0000-000000000001' and status='active') then
    raise exception 'starting point did not select an adaptive topic route';
  end if;
end $$;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set role authenticated;
do $$
begin
  begin
    perform public.teacher_configure_class(
      'a0000000-0000-0000-0000-000000000001','Learner tamper',
      '21000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000001',
      array['40000000-0000-0000-0000-000000000004'::uuid],
      '40000000-0000-0000-0000-000000000004',
      '2026-09-01','2027-07-31',2,true
    );
    raise exception 'learner configured a class';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
