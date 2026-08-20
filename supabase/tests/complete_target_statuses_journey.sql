\set ON_ERROR_STOP on

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set role authenticated;
create temporary table target_status_ids(id uuid);
grant select,insert on target_status_ids to authenticated;
insert into target_status_ids
select public.teacher_create_target(
  '90000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'weekly',null,'51000000-0000-0000-0000-000000000001',
  '52000000-0000-0000-0000-000000000001',
  'Complete two equivalent variable questions with at least 70 percent accuracy.',
  'Recent evidence shows more independent practice is useful.',
  '{"source":"status-test"}'::jsonb,current_date,current_date+7,current_date+5,
  'At least 70 percent on equivalent questions without hints.',
  'Created for target lifecycle verification.'
);
select public.teacher_update_target(
  (select id from target_status_ids),'approved',
  'Complete two equivalent variable questions with at least 70 percent accuracy.',
  'Approved after evidence review.'
);
select public.teacher_update_target(
  (select id from target_status_ids),'extended',
  'Complete two equivalent variable questions with at least 70 percent accuracy.',
  'Deadline extended because additional guided practice was allocated.'
);
reset role;

do $$
begin
  if not exists(select 1 from public.targets
    where id=(select id from target_status_ids)
      and status='extended'
      and approved_by='90000000-0000-0000-0000-000000000001'
      and approved_at is not null) then
    raise exception 'approved/extended target lifecycle failed';
  end if;
end $$;

