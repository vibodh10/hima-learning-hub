\set ON_ERROR_STOP on

begin;

-- The test fixture's owning teacher has an active Unit 6 class assignment.
insert into public.class_units(class_id,unit_id,active,selected_by)
values(
  'a0000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000006',true,
  '90000000-0000-0000-0000-000000000001'
)
on conflict(class_id,unit_id) do update
set active=true,archived_at=null;

insert into auth.users(
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
('00000000-0000-0000-0000-000000000000','90000000-0000-0000-0000-000000000011','authenticated','authenticated',
 'other-teacher@northbridge.example',extensions.crypt('LocalOnly!26',extensions.gen_salt('bf')),now(),
 '{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','90000000-0000-0000-0000-000000000012','authenticated','authenticated',
 'external-admin@example.test',extensions.crypt('LocalOnly!26',extensions.gen_salt('bf')),now(),
 '{}','{}',now(),now());

insert into public.organisations(id,name)
values('10000000-0000-0000-0000-000000000099','Separate College');
insert into public.user_profiles(id,organisation_id,role,display_name) values
('90000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000001','teacher','Other Teacher'),
('90000000-0000-0000-0000-000000000012','10000000-0000-0000-0000-000000000099','administrator','External Admin');

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
insert into public.workbook_teacher_decisions(
  learner_id,teacher_id,organisation_id,unit_code,decision_type,reason
) values(
  '90000000-0000-0000-0000-000000000002',auth.uid(),
  '10000000-0000-0000-0000-000000000001','6','feedback',
  'The owning teacher recorded a scoped evidence decision.'
);
reset role;

-- A different teacher in the same organisation cannot read or write the
-- learner's workbook decisions without an active class relationship.
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000011';
set local role authenticated;
do $$
begin
  if exists(select 1 from public.workbook_teacher_decisions) then
    raise exception 'unrelated teacher could read a learner workbook decision';
  end if;
  begin
    insert into public.workbook_teacher_decisions(
      learner_id,teacher_id,organisation_id,unit_code,decision_type,reason
    ) values(
      '90000000-0000-0000-0000-000000000002',auth.uid(),
      '10000000-0000-0000-0000-000000000001','6','feedback',
      'An unrelated teacher must not create this workbook decision.'
    );
    raise exception 'unrelated teacher created a learner workbook decision';
  exception when sqlstate '42501' then null;
  end;
end $$;
reset role;

-- Administrators are organisation-scoped rather than global.
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000012';
set local role authenticated;
do $$
begin
  if public.can_access_learner('90000000-0000-0000-0000-000000000002') then
    raise exception 'administrator could access a learner in another organisation';
  end if;
  if public.can_manage_class('a0000000-0000-0000-0000-000000000001') then
    raise exception 'administrator could manage a class in another organisation';
  end if;
end $$;
reset role;

-- An explicitly assigned co-teacher keeps the same scoped access as the lead.
insert into public.class_teachers(class_id,teacher_id,is_lead)
values(
  'a0000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000011',false
);
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000011';
set local role authenticated;
do $$
begin
  if not public.can_manage_class('a0000000-0000-0000-0000-000000000001')
    or not public.can_access_learner('90000000-0000-0000-0000-000000000002')
    or not public.can_manage_workbook_learner_unit(
      '90000000-0000-0000-0000-000000000002','6'
    ) then
    raise exception 'authorised co-teacher lost scoped class access';
  end if;
end $$;
reset role;

-- Archiving a profile immediately removes its self/class access.
update public.user_profiles set archived_at=now()
where id='90000000-0000-0000-0000-000000000002';
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set local role authenticated;
do $$
begin
  if public.can_access_learner(auth.uid()) then
    raise exception 'archived learner retained profile access';
  end if;
  if public.can_access_class('a0000000-0000-0000-0000-000000000001') then
    raise exception 'archived learner retained class access';
  end if;
end $$;
reset role;

rollback;
