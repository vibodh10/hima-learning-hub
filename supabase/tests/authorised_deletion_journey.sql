\set ON_ERROR_STOP on

update public.user_profiles
set role='administrator'
where id='90000000-0000-0000-0000-000000000001';

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

