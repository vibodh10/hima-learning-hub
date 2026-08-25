\set ON_ERROR_STOP on

begin;

update public.achievement_point_rules set enabled=false
where organisation_id='10000000-0000-0000-0000-000000000001';
update public.achievement_point_rules set enabled=true,points=100
where organisation_id='10000000-0000-0000-0000-000000000001'
  and code='learning_completed';

create temporary table achievement_attempt(id uuid);
grant select,insert on achievement_attempt to authenticated;
create temporary table achievement_worksheet(id uuid);
grant select,insert on achievement_worksheet to authenticated;
create temporary table achievement_template(id uuid);
insert into achievement_template
select template.id from public.learning_journey_templates template
join public.units unit on unit.id=template.unit_id
where unit.code='4' and template.status='approved'
  and unit.course_id=(select course_id from public.classes
    where id='a0000000-0000-0000-0000-000000000001') limit 1;
grant select on achievement_template to authenticated;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set local role authenticated;
insert into achievement_attempt
select (public.submit_activity(
  '72000000-0000-0000-0000-000000000002',
  '{"81000000-0000-0000-0000-000000000025":"7","81000000-0000-0000-0000-000000000026":"str, int, float","81000000-0000-0000-0000-000000000027":"distance = float(input(\"Distance: \"))","81000000-0000-0000-0000-000000000028":"7.0","81000000-0000-0000-0000-000000000029":"logic error"}'::jsonb,0
)->>'attemptId')::uuid;
select public.apply_achievement_point_rules((select id from achievement_attempt));
select public.apply_achievement_point_rules((select id from achievement_attempt));

do $$
declare summary record;
begin
  select * into summary from public.learner_achievement_summary(
    '90000000-0000-0000-0000-000000000002'
  );
  if summary.ap_total<>100 or summary.current_level_code<>'gold' then
    raise exception 'achievement summary was not calculated from cumulative AP: %',row_to_json(summary);
  end if;
  if (select count(*) from public.learner_achievement_point_events
      where learner_id='90000000-0000-0000-0000-000000000002')<>1 then
    raise exception 'achievement events were duplicated';
  end if;
  if not exists(select 1 from public.certificate_eligibility_reviews review
      join public.achievement_levels level on level.id=review.level_id
      where review.learner_id='90000000-0000-0000-0000-000000000002'
        and level.code='gold' and review.status='pending_review') then
    raise exception 'Gold did not create certificate eligibility for staff review';
  end if;
end $$;
reset role;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
select public.start_group_learning_journey(
  'a0000000-0000-0000-0000-000000000001',
  (select id from achievement_template)
);
select public.teacher_recognise_learner(
  '90000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  (select id from public.recognition_templates where code='noticed-improvement')
);
reset role;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set local role authenticated;
insert into achievement_worksheet
select public.submit_my_topic_worksheet(
  '4','A1','standard','before',
  '{"mainTask":"A genuine starting response.","knowledgeCheck":"A checked response.","practicalApplication":"A practical artifact."}'::jsonb,3
);
select public.apply_worksheet_achievement_points((select id from achievement_worksheet));
select public.apply_worksheet_achievement_points((select id from achievement_worksheet));

do $$
declare summary record;
begin
  select * into summary from public.learner_achievement_summary(
    '90000000-0000-0000-0000-000000000002'
  );
  if summary.ap_total<>200 or summary.current_level_code<>'diamond' then
    raise exception 'worksheet AP or Diamond progression is incorrect: %',row_to_json(summary);
  end if;
end $$;
reset role;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
do $$
declare class_summary record;
begin
  select * into class_summary from public.class_learner_achievement(
    'a0000000-0000-0000-0000-000000000001'
  ) where learner_id='90000000-0000-0000-0000-000000000002';
  if class_summary.ap_total<>200 or class_summary.achievement_level<>'Diamond'
    or class_summary.certificate_status<>'pending_review' then
    raise exception 'teacher class achievement summary is incorrect: %',row_to_json(class_summary);
  end if;
end $$;
reset role;

update public.achievement_point_rules set enabled=true,points=20
where organisation_id='10000000-0000-0000-0000-000000000001'
  and code='excellent_attendance';
insert into public.attendance_provider_connections(
  organisation_id,provider_name,connection_status,updated_by
) values(
  '10000000-0000-0000-0000-000000000001','Verified MIS','connected',
  '90000000-0000-0000-0000-000000000001'
) on conflict(organisation_id) do update set connection_status='connected';
insert into public.attendance_events(
  organisation_id,provider_event_id,learner_id,class_id,session_on,
  attendance_status,provider_name,evidence
)
select '10000000-0000-0000-0000-000000000001','verified-'||session_number,
  '90000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001','2026-01-01'::date+session_number-1,
  case when session_number=20 then 'absent' else 'present' end,
  'Verified MIS','{"source":"provider_import"}'::jsonb
from generate_series(1,20) session_number;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
select public.apply_verified_attendance_achievement(
  '90000000-0000-0000-0000-000000000002','2026-01-01','2026-01-20'
);
select public.apply_verified_attendance_achievement(
  '90000000-0000-0000-0000-000000000002','2026-01-01','2026-01-20'
);
reset role;

do $$
begin
  if not exists(select 1 from public.learner_recognitions
      where learner_id='90000000-0000-0000-0000-000000000002'
        and title='Progress noticed') then
    raise exception 'professional recognition was not recorded';
  end if;
  if (select coalesce(sum(points),0) from public.learner_achievement_point_events
      where learner_id='90000000-0000-0000-0000-000000000002')<>220 then
    raise exception 'verified 95 percent attendance did not award one configured AP event';
  end if;
end $$;

rollback;
