\set ON_ERROR_STOP on

grant select on public.classes to authenticated;
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set role authenticated;
do $$ begin
  perform public.submit_activity(
    '70000000-0000-0000-0000-000000000001',
    '{
      "80000000-0000-0000-0000-000000000001":"Firewall",
      "80000000-0000-0000-0000-000000000002":"true",
      "80000000-0000-0000-0000-000000000003":"depth",
      "80000000-0000-0000-0000-000000000004":["Separate network segment","Firewall rules"],
      "80000000-0000-0000-0000-000000000005":"80"
    }'::jsonb,
    0
  );
end $$;
reset role;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set role authenticated;

create temporary table enrolment_lifecycle_ids(id uuid);
grant select,insert on enrolment_lifecycle_ids to authenticated;
insert into enrolment_lifecycle_ids
select public.teacher_duplicate_class(
  'a0000000-0000-0000-0000-000000000001',
  'Lifecycle Destination',
  'LIFE-2026'
);

select public.teacher_move_student(
  '90000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  (select id from enrolment_lifecycle_ids),
  'Lifecycle integration test'
);

select public.teacher_archive_enrolment(
  '90000000-0000-0000-0000-000000000002',
  (select id from enrolment_lifecycle_ids),
  'Learner left the test class'
);

reset role;

do $$
declare destination_uuid uuid:=(select id from enrolment_lifecycle_ids);
begin
  if exists(
    select 1 from public.enrolments
    where student_id='90000000-0000-0000-0000-000000000002'
      and class_id=destination_uuid
      and archived_at is null
  ) then
    raise exception 'active enrolment was not archived';
  end if;

  if (select count(*) from public.enrolment_history
      where student_id='90000000-0000-0000-0000-000000000002') < 2 then
    raise exception 'move and archive history were not preserved';
  end if;

  if not exists(
    select 1 from public.audit_logs
    where action='learner.moved'
      and entity_id='90000000-0000-0000-0000-000000000002'
  ) or not exists(
    select 1 from public.audit_logs
    where action='enrolment.archived'
      and entity_id='90000000-0000-0000-0000-000000000002'
  ) then
    raise exception 'lifecycle audit evidence is incomplete';
  end if;

  if not exists(
    select 1 from public.attempts
    where learner_id='90000000-0000-0000-0000-000000000002'
  ) then
    raise exception 'historical learner attempts were lost';
  end if;
end $$;
