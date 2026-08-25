\set ON_ERROR_STOP on

begin;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
do $$
begin
  perform public.teacher_set_content_status(
    'lesson','60000000-0000-0000-0000-000000000001','approved'
  );
  raise exception 'ordinary teacher unexpectedly changed curriculum status';
exception when sqlstate '42501' then
  null;
end $$;
reset role;

update public.user_profiles set role='administrator'
where id='90000000-0000-0000-0000-000000000001';
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
select public.teacher_set_content_status(
  'lesson','60000000-0000-0000-0000-000000000001','approved'
);
reset role;

do $$
begin
  if not exists(select 1 from public.audit_logs
      where action='content.status_changed' and entity_type='lesson'
        and entity_id='60000000-0000-0000-0000-000000000001') then
    raise exception 'administrator curriculum change was not audited';
  end if;
end $$;

rollback;
