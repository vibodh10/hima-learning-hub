\set ON_ERROR_STOP on

begin;

insert into auth.users(
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '92000000-0000-0000-0000-000000000001','authenticated','authenticated',
  'invited-only@example.test',extensions.crypt('Temporary!26',extensions.gen_salt('bf')),null,
  '{"provider":"email","providers":["email"]}','{"display_name":"Invited Only"}',now(),now()
);

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;

do $$
declare resolution record;
begin
  select * into resolution
  from public.resolve_invitable_auth_user('invited-only@example.test');
  if not resolution.account_exists or resolution.profile_exists
    or not resolution.permitted
    or resolution.user_id<>'92000000-0000-0000-0000-000000000001' then
    raise exception 'an Auth-only invitation account was not identified as recoverable';
  end if;
end $$;

reset role;

insert into public.student_invitations(
  id,organisation_id,class_id,email_normalized,display_name,auth_user_id,
  status,invited_by,last_detail_code
) values (
  '93000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'learner@northbridge.example','Sam Taylor',
  '90000000-0000-0000-0000-000000000002','sent',
  '90000000-0000-0000-0000-000000000001','email_requested'
), (
  '93000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'invited-only@example.test','Invited Only',
  '92000000-0000-0000-0000-000000000001','sent',
  '90000000-0000-0000-0000-000000000001','recovery_requested'
), (
  '93000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'joined@example.test','Joined Learner',null,'accepted',
  '90000000-0000-0000-0000-000000000001','student_authenticated'
);

insert into public.organisations(id,name)
values('11000000-0000-0000-0000-000000000001','Other Test College');
update public.user_profiles
set organisation_id='11000000-0000-0000-0000-000000000001'
where id='90000000-0000-0000-0000-000000000001';

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;

do $$
declare resolution record;
begin
  select * into resolution
  from public.resolve_invitable_auth_user('invited-only@example.test');
  if not resolution.account_exists or resolution.profile_exists
    or resolution.permitted or resolution.user_id is not null
    or resolution.block_code<>'different_organisation' then
    raise exception 'a pending Auth-only invitation crossed organisation boundaries';
  end if;
end $$;

reset role;
update public.user_profiles
set organisation_id='10000000-0000-0000-0000-000000000001'
where id='90000000-0000-0000-0000-000000000001';

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;

select public.manage_student_invitation(
  '93000000-0000-0000-0000-000000000001','cancelled'
);
select public.manage_student_invitation(
  '93000000-0000-0000-0000-000000000001','cancelled'
);
select public.manage_student_invitation(
  '93000000-0000-0000-0000-000000000002','expired'
);

reset role;

do $$
begin
  if not exists (
    select 1 from public.student_invitations
    where id='93000000-0000-0000-0000-000000000001'
      and status='cancelled' and cancelled_at is not null
      and last_detail_code='teacher_cancelled'
  ) then
    raise exception 'cancellation was not stored durably';
  end if;
  if exists (
    select 1 from public.enrolments
    where class_id='a0000000-0000-0000-0000-000000000001'
      and student_id='90000000-0000-0000-0000-000000000002'
      and archived_at is null
  ) then
    raise exception 'the legacy provisional enrolment remained active after cancellation';
  end if;
  if (select count(*) from public.student_invitation_events
      where invitation_id='93000000-0000-0000-0000-000000000001'
        and status='cancelled')<>1 then
    raise exception 'idempotent cancellation emitted duplicate events';
  end if;
  if not exists (
    select 1 from public.audit_logs
    where action='student.invitation_cancelled'
      and entity_id='93000000-0000-0000-0000-000000000001'
      and after_data->>'provisional_enrolment_archived'='true'
  ) then
    raise exception 'cancellation and legacy access cleanup were not audited';
  end if;
  if not exists (
    select 1 from public.student_invitations
    where id='93000000-0000-0000-0000-000000000002'
      and status='expired' and expired_at is not null
      and last_detail_code='teacher_marked_expired'
  ) then
    raise exception 'expiry was not stored durably';
  end if;

end $$;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;

do $$
begin
  begin
    perform public.manage_student_invitation(
      '93000000-0000-0000-0000-000000000003','cancelled'
    );
    raise exception 'an accepted invitation was changed';
  exception when sqlstate '22023' then
    null;
  end;
end $$;

reset role;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set local role authenticated;

do $$
begin
  begin
    perform public.manage_student_invitation(
      '93000000-0000-0000-0000-000000000002','cancelled'
    );
    raise exception 'a learner managed a staff-controlled invitation';
  exception when sqlstate '42501' then
    null;
  end;
end $$;

do $$
begin
  begin
    update public.student_invitations
    set status='sent'
    where id='93000000-0000-0000-0000-000000000002';
    raise exception 'a learner received direct invitation update permission';
  exception when sqlstate '42501' then
    null;
  end;
end $$;

reset role;

do $$
begin
  if (select status from public.student_invitations
      where id='93000000-0000-0000-0000-000000000002')<>'expired' then
    raise exception 'a learner bypassed the invitation lifecycle RPC';
  end if;
end $$;

rollback;
