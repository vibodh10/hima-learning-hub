\set ON_ERROR_STOP on

begin;

insert into auth.users(
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
('00000000-0000-0000-0000-000000000000','90000000-0000-0000-0000-000000000011','authenticated','authenticated',
 'unrelated-teacher@northbridge.example',extensions.crypt('LocalOnly!26',extensions.gen_salt('bf')),now(),
 '{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','90000000-0000-0000-0000-000000000012','authenticated','authenticated',
 'unrelated-learner@northbridge.example',extensions.crypt('LocalOnly!26',extensions.gen_salt('bf')),now(),
 '{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','90000000-0000-0000-0000-000000000013','authenticated','authenticated',
 'administrator@northbridge.example',extensions.crypt('LocalOnly!26',extensions.gen_salt('bf')),now(),
 '{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','90000000-0000-0000-0000-000000000014','authenticated','authenticated',
 'external-administrator@example.test',extensions.crypt('LocalOnly!26',extensions.gen_salt('bf')),now(),
 '{}','{}',now(),now());

insert into public.organisations(id,name)
values('10000000-0000-0000-0000-000000000099','Separate College');

insert into public.user_profiles(id,organisation_id,role,display_name) values
('90000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000001','teacher','Unrelated Teacher'),
('90000000-0000-0000-0000-000000000012','10000000-0000-0000-0000-000000000001','student','Unrelated Learner'),
('90000000-0000-0000-0000-000000000013','10000000-0000-0000-0000-000000000001','administrator','Northbridge Administrator'),
('90000000-0000-0000-0000-000000000014','10000000-0000-0000-0000-000000000099','administrator','External Administrator');

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
insert into public.deadlines(organisation_id,class_id,title,kind,occurs_at,created_by)
values(
  '10000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Unit submission','assignment_submission','2026-10-05T16:00:00Z',auth.uid()
);
reset role;

-- The learner actively enrolled in the class can read its date.
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set local role authenticated;
do $$
begin
  if not exists(select 1 from public.deadlines where title='Unit submission') then
    raise exception 'active class learner could not read the class deadline';
  end if;
  begin
    insert into public.deadlines(organisation_id,class_id,title,kind,occurs_at,created_by)
    values(
      '10000000-0000-0000-0000-000000000001',
      'a0000000-0000-0000-0000-000000000001',
      'Learner-created date','assignment_submission','2026-10-06T16:00:00Z',auth.uid()
    );
    raise exception 'student created a class deadline';
  exception when sqlstate '42501' then null;
  end;
end $$;
reset role;

-- Same-organisation users without a class relationship cannot see or create
-- dates for that class.
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000011';
set local role authenticated;
do $$
begin
  if exists(select 1 from public.deadlines where title='Unit submission') then
    raise exception 'unrelated teacher could read another class deadline';
  end if;
  begin
    insert into public.deadlines(organisation_id,class_id,title,kind,occurs_at,created_by)
    values(
      '10000000-0000-0000-0000-000000000001',
      'a0000000-0000-0000-0000-000000000001',
      'Unrelated teacher date','assignment_submission','2026-10-07T16:00:00Z',auth.uid()
    );
    raise exception 'unrelated teacher created another class deadline';
  exception when sqlstate '42501' then null;
  end;
end $$;
reset role;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000012';
set local role authenticated;
do $$
begin
  if exists(select 1 from public.deadlines where title='Unit submission') then
    raise exception 'unrelated learner could read another class deadline';
  end if;
end $$;
reset role;

-- An administrator can create an organisation-wide date. It is visible to
-- members of that organisation but not to another organisation.
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000013';
set local role authenticated;
insert into public.deadlines(organisation_id,class_id,title,kind,occurs_at,created_by)
values(
  '10000000-0000-0000-0000-000000000001',null,
  'College examination window','examination_window','2027-01-04T09:00:00Z',auth.uid()
);
reset role;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000012';
set local role authenticated;
do $$
begin
  if not exists(select 1 from public.deadlines where title='College examination window') then
    raise exception 'organisation-wide date was hidden from an organisation member';
  end if;
end $$;
reset role;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000014';
set local role authenticated;
do $$
begin
  if exists(select 1 from public.deadlines) then
    raise exception 'external administrator could read another organisation deadlines';
  end if;
  begin
    insert into public.deadlines(organisation_id,class_id,title,kind,occurs_at,created_by)
    values(
      '10000000-0000-0000-0000-000000000099',
      'a0000000-0000-0000-0000-000000000001',
      'Cross-organisation date','assignment_submission','2026-10-08T16:00:00Z',auth.uid()
    );
    raise exception 'external administrator created a date for another organisation class';
  exception when sqlstate '42501' then null;
  end;
end $$;
reset role;

rollback;
