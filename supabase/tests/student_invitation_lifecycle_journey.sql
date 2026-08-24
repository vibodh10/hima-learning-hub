\set ON_ERROR_STOP on

begin;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;

do $$
declare resolution record;
begin
  select * into resolution
  from public.resolve_invitable_auth_user('learner@northbridge.example');
  if not resolution.account_exists or not resolution.permitted
    or resolution.user_id<>'90000000-0000-0000-0000-000000000002' then
    raise exception 'the exact existing learner was not resolved safely';
  end if;

  select * into resolution
  from public.resolve_invitable_auth_user('missing@example.test');
  if resolution.account_exists or not resolution.permitted or resolution.user_id is not null then
    raise exception 'an unknown email returned an unsafe account resolution';
  end if;
end $$;

reset role;

insert into public.student_invitations(
  organisation_id,class_id,email_normalized,display_name,auth_user_id,status,invited_by,last_detail_code
) values(
  '10000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'learner@northbridge.example','Sam Taylor',
  '90000000-0000-0000-0000-000000000002','sent',
  '90000000-0000-0000-0000-000000000001','email_requested'
);

set local role authenticated;

do $$
begin
  if (select count(*) from public.student_invitations)<>1 then
    raise exception 'the managing teacher cannot read the invitation';
  end if;
  if exists(select 1 from public.student_invitations where metadata ? 'token') then
    raise exception 'raw tokens must never be stored in invitation metadata';
  end if;
end $$;

reset role;

insert into public.student_invitation_events(invitation_id,actor_id,status,detail_code)
select id,'90000000-0000-0000-0000-000000000001','sent','email_requested'
from public.student_invitations;

set local role authenticated;

do $$
begin
  if (select count(*) from public.student_invitation_events)<>1 then
    raise exception 'the managing teacher cannot read invitation events';
  end if;
  if (select detail_code from public.student_invitation_events limit 1)<>'email_requested' then
    raise exception 'the invitation event detail is not the expected non-sensitive code';
  end if;
end $$;

reset role;
rollback;
