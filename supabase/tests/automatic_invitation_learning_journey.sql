\set ON_ERROR_STOP on

begin;

update public.classes set
  active_unit_id='40000000-0000-0000-0000-000000000004',
  published=true
where id='a0000000-0000-0000-0000-000000000001';

insert into public.class_units(class_id,unit_id,active,selected_by,archived_at)
values(
  'a0000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000004',true,
  '90000000-0000-0000-0000-000000000001',null
)
on conflict(class_id,unit_id) do update set active=true,archived_at=null;

insert into public.student_invitations(
  organisation_id,class_id,email_normalized,display_name,auth_user_id,status,invited_by,last_detail_code
) values(
  '10000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'journey-test@northbridge.example','Sam Taylor',
  '90000000-0000-0000-0000-000000000002','sent',
  '90000000-0000-0000-0000-000000000001','email_requested'
);

do $$
begin
  if exists(select 1 from public.group_learning_journeys) then
    raise exception 'sending an invitation incorrectly started a journey';
  end if;
end $$;

update public.student_invitations set
  status='accepted',accepted_at=now(),last_detail_code='account_connected'
where class_id='a0000000-0000-0000-0000-000000000001'
  and email_normalized='journey-test@northbridge.example';

do $$
declare journey record;
begin
  select * into journey from public.group_learning_journeys;

  if journey.id is null
    or journey.class_id<>'a0000000-0000-0000-0000-000000000001'
    or journey.unit_id<>'40000000-0000-0000-0000-000000000004'
    or journey.started_by<>'90000000-0000-0000-0000-000000000001'
    or journey.settings->>'start_mode'<>'automatic_first_accepted_invitation' then
    raise exception 'the accepted invitation did not create the expected journey: %',row_to_json(journey);
  end if;

  if (select count(*) from public.group_learning_journeys)<>1 then
    raise exception 'the accepted invitation created more than one journey';
  end if;

  if not exists(
    select 1 from public.audit_logs audit
    where audit.action='group_journey.auto_started'
      and audit.entity_id=journey.id
      and audit.after_data->>'invitation_id' is not null
  ) then
    raise exception 'the automatic journey activation was not audited';
  end if;
end $$;

insert into public.student_invitations(
  organisation_id,class_id,email_normalized,display_name,auth_user_id,status,invited_by,accepted_at,last_detail_code
) values(
  '10000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'second-journey-test@northbridge.example','Second acceptance',
  '90000000-0000-0000-0000-000000000002','accepted',
  '90000000-0000-0000-0000-000000000001',now(),'account_connected'
);

do $$
begin
  if (select count(*) from public.group_learning_journeys)<>1
    or (select count(*) from public.audit_logs where action='group_journey.auto_started')<>1 then
    raise exception 'a later accepted invitation restarted the class journey';
  end if;
end $$;

rollback;
