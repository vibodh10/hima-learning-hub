\set ON_ERROR_STOP on

begin;

insert into public.group_learning_journeys(
  class_id,template_id,unit_id,started_by
)
select
  'a0000000-0000-0000-0000-000000000001',template.id,unit.id,
  '90000000-0000-0000-0000-000000000001'
from public.learning_journey_templates template
join public.units unit on unit.id=template.unit_id
where unit.code='4' and template.status='approved' and template.archived_at is null
order by template.version_number desc limit 1;

update public.group_learning_journeys set started_on='2026-08-31'
where class_id='a0000000-0000-0000-0000-000000000001' and status='active';
update public.enrolments set archived_at=now()
where class_id='a0000000-0000-0000-0000-000000000001';

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;

select public.teacher_configure_class(
  'a0000000-0000-0000-0000-000000000001',
  'Wednesday IoT group',
  '21000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  array[
    '43000000-0000-0000-0000-000000000014'::uuid,
    '43000000-0000-0000-0000-000000000019'::uuid
  ],
  '43000000-0000-0000-0000-000000000019',
  '2026-09-01','2026-12-18',array[3],true
);

reset role;

do $$
begin
  if not exists(
    select 1 from public.group_learning_journeys journey
    join public.units unit on unit.id=journey.unit_id
    where journey.class_id='a0000000-0000-0000-0000-000000000001'
      and journey.status='active' and journey.archived_at is null
      and unit.code='19' and journey.started_on='2026-08-31'
  ) then
    raise exception 'the empty group was not retargeted to Unit 19 with its teaching timeline preserved';
  end if;
  if not exists(
    select 1 from public.group_learning_journeys journey
    join public.units unit on unit.id=journey.unit_id
    where journey.class_id='a0000000-0000-0000-0000-000000000001'
      and journey.status='cancelled' and journey.archived_at is not null and unit.code='4'
  ) then
    raise exception 'the superseded empty-group journey was not retained as cancelled history';
  end if;
  if not exists(select 1 from public.audit_logs
      where action='group_journey.retargeted'
        and after_data->>'unit_id'='43000000-0000-0000-0000-000000000019') then
    raise exception 'the journey correction was not audited';
  end if;
end $$;

update public.enrolments set archived_at=null
where class_id='a0000000-0000-0000-0000-000000000001';

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;

do $$
begin
  begin
    perform public.teacher_configure_class(
      'a0000000-0000-0000-0000-000000000001','Protected learner group',
      '21000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000001',
      array['40000000-0000-0000-0000-000000000004'::uuid],
      '40000000-0000-0000-0000-000000000004',
      '2026-09-01','2026-12-18',array[3],true
    );
    raise exception 'an active learner journey was rewritten';
  exception when sqlstate '55000' then
    null;
  end;
end $$;

reset role;

do $$
begin
  if not exists(
    select 1 from public.group_learning_journeys journey
    join public.units unit on unit.id=journey.unit_id
    where journey.class_id='a0000000-0000-0000-0000-000000000001'
      and journey.status='active' and journey.archived_at is null and unit.code='19'
  ) then
    raise exception 'the active learner journey was not protected after the rejected change';
  end if;
end $$;

rollback;
