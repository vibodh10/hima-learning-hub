\set ON_ERROR_STOP on
begin;
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
select public.start_group_learning_journey('a0000000-0000-0000-0000-000000000001',
  (select id from public.learning_journey_templates where unit_id='40000000-0000-0000-0000-000000000004' and status='approved' limit 1));
reset role;
update public.group_learning_journeys set started_on=current_date-14 where class_id='a0000000-0000-0000-0000-000000000001';
set local role authenticated;
select public.refresh_learner_automation('90000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001');
select public.refresh_learner_automation('90000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001');
reset role;
do $$ begin
  if (select count(*) from public.targets where automation_key is not null)<>1 then raise exception 'duplicate or missing automatic goal'; end if;
  if not exists(select 1 from public.targets where automation_key is not null and status='active' and topic_id is null and success_measure is not null and review_on is not null) then raise exception 'weekly diagnostic target was not activated'; end if;
  if exists(select 1 from public.learner_automation_summaries where appreciation is not null) then raise exception 'praised missing work'; end if;
end $$;
insert into public.unit_starting_point_baselines(organisation_id,learner_id,unit_id,unit_code,recommended_level,correct_count,question_count,percentage,responses,evidence)
select organisation_id,id,'40000000-0000-0000-0000-000000000004','4','Core',7,10,70,'[]','[]'
from public.user_profiles where id='90000000-0000-0000-0000-000000000002';
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set local role authenticated;
select public.refresh_learner_automation('90000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001');
do $$ begin
  if not exists(select 1 from public.learner_automation_summaries where appreciation like '%starting-point%') then raise exception 'completion was not appreciated'; end if;
  begin
    perform public.refresh_learner_automation('90000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001');
    raise exception 'student refreshed a different account';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.learner_automation_summaries set appreciation='invented';
    raise exception 'browser altered generated feedback';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$ begin
  if not exists(select 1 from public.targets where automation_key is not null and evidence->>'teaching_week'='1' and status='achieved') then raise exception 'completion was not detected'; end if;
end $$;
insert into public.learner_curriculum_attempts(learner_id,kind,unit_code,topic_code,percentage,completed_at)
values ('90000000-0000-0000-0000-000000000002','topic_practice','4','A1',40,now()-interval '1 hour'),
 ('90000000-0000-0000-0000-000000000002','topic_practice','4','A1',80,now());
set local role authenticated;
select public.refresh_learner_automation('90000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001');
do $$ begin
  if not exists(select 1 from public.learner_automation_summaries where appreciation like '%improved from 40% to 80%')
    and not exists(select 1 from public.learner_automation_summaries where appreciation like '%improved from 40.00% to 80.00%') then
    raise exception 'recorded comparable improvement did not produce appreciation';
  end if;
end $$;
reset role;
-- The formerly failing weekly target with no single topic is now valid.
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
select public.teacher_create_target('90000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001',
  'weekly',null,null,null,'Complete the weekly practice and review.','Recorded practice needs review.','{}',current_date,current_date+7,current_date+7,'Complete and save the practice.','');
reset role;
select 'automatic learning admin passed' result;
rollback;
