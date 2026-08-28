\set ON_ERROR_STOP on

update public.user_profiles
set role='administrator'
where id='90000000-0000-0000-0000-000000000001';

-- Evidence stores added after the original deletion routine must not leave a
-- dangling FK or retain learner evidence after an authorised deletion.
insert into public.student_invitations(
  id,organisation_id,class_id,email_normalized,display_name,auth_user_id,status,invited_by
) values(
  'b1000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001','deletion.test@example.invalid','Deletion test learner',
  '90000000-0000-0000-0000-000000000002','accepted','90000000-0000-0000-0000-000000000001'
);
insert into public.student_invitation_events(invitation_id,actor_id,status,detail_code)
values('b1000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000002','accepted','learner_accepted');

insert into public.group_learning_journeys(id,class_id,template_id,unit_id,started_by)
select 'b1000000-0000-0000-0000-000000000002',class.id,template.id,template.unit_id,
  '90000000-0000-0000-0000-000000000001'
from public.classes class
join public.learning_journey_templates template on template.unit_id=class.active_unit_id
  and template.status='approved' and template.archived_at is null
where class.id='a0000000-0000-0000-0000-000000000001'
  and not exists(select 1 from public.group_learning_journeys journey
    where journey.class_id=class.id and journey.status='active' and journey.archived_at is null)
order by template.version_number desc limit 1;

insert into public.attempts(
  id,learner_id,activity_id,attempt_number,hints_used,feedback_shown,pathway
) values(
  'b1000000-0000-0000-0000-000000000003','90000000-0000-0000-0000-000000000002',
  '70000000-0000-0000-0000-000000000001',900,0,false,'Core'
);
insert into public.attempt_answers(
  id,attempt_id,question_id,answer,mark,max_mark,is_correct,hints_used
) values(
  'b1000000-0000-0000-0000-000000000004','b1000000-0000-0000-0000-000000000003',
  '80000000-0000-0000-0000-000000000001','"Firewall"',1,1,true,0
);
insert into public.formative_response_reviews(id,attempt_answer_id,learner_id)
values(
  'b1000000-0000-0000-0000-000000000005','b1000000-0000-0000-0000-000000000004',
  '90000000-0000-0000-0000-000000000002'
);
insert into public.activity_unlock_overrides(
  id,learner_id,activity_id,reason,teacher_id
) values(
  'b1000000-0000-0000-0000-000000000006','90000000-0000-0000-0000-000000000002',
  '70000000-0000-0000-0000-000000000001','Deletion lifecycle contract evidence',
  '90000000-0000-0000-0000-000000000001'
);

insert into public.learner_topic_worksheets(
  id,learner_id,class_id,unit_code,topic_code,attempt_number,mode,evidence_stage,responses,confidence
) values(
  'b1000000-0000-0000-0000-000000000007','90000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001','4','A1',900,'standard','learning','{}',3
);
insert into public.learner_portfolio_artifacts(
  id,learner_id,class_id,unit_code,topic_code,stage,title,source_type,source_id,evidence
) values(
  'b1000000-0000-0000-0000-000000000008','90000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001','4','A1','learning','Deletion lifecycle worksheet',
  'topic_worksheet','b1000000-0000-0000-0000-000000000007','{}'
);
insert into public.learner_catch_up_records(
  id,learner_id,class_id,journey_id,unit_code,topic_code,source,opened_teaching_week,
  completion_worksheet_id
) select
  'b1000000-0000-0000-0000-000000000009','90000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',journey.id,'4','A1','self_reported',1,
  'b1000000-0000-0000-0000-000000000007'
from public.group_learning_journeys journey
where journey.class_id='a0000000-0000-0000-0000-000000000001'
order by journey.started_at desc limit 1;
insert into public.learner_catch_up_events(catch_up_id,status,source)
values('b1000000-0000-0000-0000-000000000009','completed','worksheet');
insert into public.attendance_events(
  id,organisation_id,provider_event_id,learner_id,class_id,session_on,attendance_status,provider_name
) values(
  'b1000000-0000-0000-0000-000000000010','10000000-0000-0000-0000-000000000001',
  'deletion-contract-event','90000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',current_date,'present','contract-test'
);

insert into public.learner_achievement_point_events(
  id,learner_id,rule_id,points,source_type,idempotency_key,description
) select
  'b1000000-0000-0000-0000-000000000011','90000000-0000-0000-0000-000000000002',
  rule.id,rule.points,'worksheet','deletion-contract-points','Deletion lifecycle contract evidence'
from public.achievement_point_rules rule
where rule.organisation_id='10000000-0000-0000-0000-000000000001'
order by rule.code limit 1;
insert into public.certificate_eligibility_reviews(id,learner_id,level_id)
select 'b1000000-0000-0000-0000-000000000012','90000000-0000-0000-0000-000000000002',level.id
from public.achievement_levels level
where level.organisation_id='10000000-0000-0000-0000-000000000001'
order by level.threshold limit 1;
insert into public.learner_recognitions(
  id,learner_id,class_id,template_id,recognised_by,title,message
) select
  'b1000000-0000-0000-0000-000000000013','90000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',template.id,
  '90000000-0000-0000-0000-000000000001','Deletion contract recognition',
  'This record proves recognition evidence is deleted with the learner account.'
from public.recognition_templates template
where template.organisation_id='10000000-0000-0000-0000-000000000001'
order by template.code limit 1;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set role authenticated;

create temporary table deletion_ids(id uuid);
grant select,insert on deletion_ids to authenticated;
insert into deletion_ids
select public.admin_request_learner_data_deletion(
  '90000000-0000-0000-0000-000000000002',
  'Authorised privacy deletion integration test'
);

select public.admin_execute_learner_data_deletion(
  (select id from deletion_ids),
  'DELETE LEARNER DATA'
);

reset role;

do $$
begin
  if exists(select 1 from public.user_profiles
    where id='90000000-0000-0000-0000-000000000002') then
    raise exception 'learner profile was not deleted';
  end if;
  if exists(select 1 from auth.users
    where id='90000000-0000-0000-0000-000000000002') then
    raise exception 'learner authentication account was not deleted';
  end if;
  if exists(select 1 from public.attempts
    where learner_id='90000000-0000-0000-0000-000000000002') then
    raise exception 'learner attempts were not deleted';
  end if;
  if exists(select 1 from public.formative_response_reviews
      where learner_id='90000000-0000-0000-0000-000000000002')
    or exists(select 1 from public.activity_unlock_overrides
      where learner_id='90000000-0000-0000-0000-000000000002')
    or exists(select 1 from public.learner_topic_worksheets
      where learner_id='90000000-0000-0000-0000-000000000002')
    or exists(select 1 from public.learner_portfolio_artifacts
      where learner_id='90000000-0000-0000-0000-000000000002')
    or exists(select 1 from public.learner_catch_up_records
      where learner_id='90000000-0000-0000-0000-000000000002')
    or exists(select 1 from public.attendance_events
      where learner_id='90000000-0000-0000-0000-000000000002')
    or exists(select 1 from public.learner_achievement_point_events
      where learner_id='90000000-0000-0000-0000-000000000002')
    or exists(select 1 from public.certificate_eligibility_reviews
      where learner_id='90000000-0000-0000-0000-000000000002')
    or exists(select 1 from public.learner_recognitions
      where learner_id='90000000-0000-0000-0000-000000000002') then
    raise exception 'newer learner evidence was not deleted';
  end if;
  if exists(select 1 from public.student_invitation_events
    where actor_id='90000000-0000-0000-0000-000000000002') then
    raise exception 'retained invitation history still identifies the deleted learner';
  end if;
  if not exists(select 1 from public.learner_data_deletion_requests
    where id=(select id from deletion_ids) and status='completed'
      and learner_id is null and completed_at is not null) then
    raise exception 'deletion authorisation evidence was not retained';
  end if;
  if not exists(select 1 from public.audit_logs
    where action='learner_data.deleted'
      and entity_id=(select id from deletion_ids)) then
    raise exception 'deletion audit record is missing';
  end if;
end $$;
