\set ON_ERROR_STOP on

begin;

update public.classes set weekly_learning_day=extract(isodow from current_date)::integer
where id='a0000000-0000-0000-0000-000000000001';
create temporary table journey_input(template_id uuid);
insert into journey_input
select template.id from public.learning_journey_templates template
join public.units unit on unit.id=template.unit_id
where unit.code='4' and unit.course_id='30000000-0000-0000-0000-000000000001' limit 1;
grant select on journey_input to authenticated;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
select public.start_group_learning_journey(
  'a0000000-0000-0000-0000-000000000001',(select template_id from journey_input)
);
reset role;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set local role authenticated;
insert into public.learner_curriculum_attempts(
  learner_id,kind,unit_code,topic_code,selected_level,percentage,mark,max_mark,
  hints_used,active_seconds,question_results
) values(
  auth.uid(),'topic_practice','4','A4','Stretch',90,9,10,0,600,'[]'
);
reset role;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
do $$
declare attention record;
begin
  select * into attention from public.class_learner_attention(
    'a0000000-0000-0000-0000-000000000001'
  ) where learner_id='90000000-0000-0000-0000-000000000002';
  if attention.attention_status<>'exceeding' or attention.current_score<>90 then
    raise exception 'secure current evidence was not shown as exceeding: %',row_to_json(attention);
  end if;
end $$;
reset role;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set local role authenticated;
select public.begin_my_topic_catch_up('4','A4');
reset role;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
do $$
declare attention record;
begin
  select * into attention from public.class_learner_attention(
    'a0000000-0000-0000-0000-000000000001'
  ) where learner_id='90000000-0000-0000-0000-000000000002';
  if attention.attention_status<>'catch_up_required' or attention.catch_up_status<>'in_progress' then
    raise exception 'catch-up did not take priority over the high score: %',row_to_json(attention);
  end if;
end $$;
reset role;

insert into public.interventions(learner_id,class_id,kind,status,created_by)
values(
  '90000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001','professional_review','open',
  '90000000-0000-0000-0000-000000000001'
);

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
do $$
begin
  if (select attention_status from public.class_learner_attention(
      'a0000000-0000-0000-0000-000000000001'
    ) where learner_id='90000000-0000-0000-0000-000000000002')<>'intervention_required' then
    raise exception 'an open intervention did not receive highest priority';
  end if;
end $$;
reset role;

rollback;
