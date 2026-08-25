\set ON_ERROR_STOP on

begin;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
do $$
begin
  perform public.create_class(
    'Teacher-created group',
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'TEACHER-DENIED'
  );
  raise exception 'ordinary teacher unexpectedly created a group';
exception when sqlstate '42501' then
  null;
end $$;
reset role;

update public.user_profiles set role='administrator'
where id='90000000-0000-0000-0000-000000000001';
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
select public.create_class(
  'Administrator-created group',
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'ADMIN-ALLOWED'
);
reset role;

do $$
begin
  if not exists(select 1 from public.audit_logs
      where action='class.created'
        and after_data->>'name'='Administrator-created group') then
    raise exception 'administrator group creation was not audited';
  end if;
end $$;

rollback;
