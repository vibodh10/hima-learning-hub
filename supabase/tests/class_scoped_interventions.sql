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

insert into public.interventions(
  learner_id,class_id,kind,status,evidence,note,created_by
) values (
  '90000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'professional_review','open','{"reason":"repeated low independent evidence"}',
  'Review the learner privately after the next independent attempt.',
  '90000000-0000-0000-0000-000000000001'
);

do $$
begin
  if has_table_privilege('authenticated','public.interventions','INSERT')
    or has_table_privilege('authenticated','public.interventions','UPDATE')
    or has_table_privilege('authenticated','public.interventions','DELETE') then
    raise exception 'authenticated browser users retain intervention write permission';
  end if;
  begin
    insert into public.interventions(
      learner_id,class_id,kind,status,evidence,note,created_by
    ) values (
      '90000000-0000-0000-0000-000000000012',
      'a0000000-0000-0000-0000-000000000001',
      'invalid_scope','open','{}','This learner is not enrolled in the selected class.',
      '90000000-0000-0000-0000-000000000001'
    );
    raise exception 'an intervention accepted a learner outside the selected class';
  exception when check_violation then null;
  end;
end $$;

-- The owning teacher can see only the exact learner/class intervention.
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
do $$
begin
  if (select count(*) from public.interventions)<>1 then
    raise exception 'owning teacher intervention scope was not exact';
  end if;
  if not exists(
    select 1 from public.interventions
    where learner_id='90000000-0000-0000-0000-000000000002'
      and kind='professional_review'
  ) then
    raise exception 'owning teacher could not read the valid intervention';
  end if;
end $$;
reset role;

-- An enrolled learner cannot read their own or another learner's professional
-- intervention rows, and cannot create one directly.
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set local role authenticated;
do $$
begin
  if exists(select 1 from public.interventions) then
    raise exception 'student could read staff-only intervention evidence';
  end if;
  begin
    insert into public.interventions(learner_id,class_id,kind,status,created_by)
    values(
      auth.uid(),'a0000000-0000-0000-0000-000000000001',
      'student_created','open',auth.uid()
    );
    raise exception 'student created an intervention';
  exception when sqlstate '42501' then null;
  end;
end $$;
reset role;

-- Same-organisation users without responsibility for the class cannot read
-- its professional intervention evidence.
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000011';
set local role authenticated;
do $$
begin
  if exists(select 1 from public.interventions) then
    raise exception 'unrelated teacher could read another class intervention';
  end if;
end $$;
reset role;

-- The same-organisation administrator can read the valid exact-class row.
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000013';
set local role authenticated;
do $$
begin
  if (select count(*) from public.interventions)<>1 then
    raise exception 'administrator intervention scope was not exact';
  end if;
end $$;
reset role;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000014';
set local role authenticated;
do $$
begin
  if exists(select 1 from public.interventions) then
    raise exception 'external administrator could read another organisation intervention';
  end if;
end $$;
reset role;

rollback;
