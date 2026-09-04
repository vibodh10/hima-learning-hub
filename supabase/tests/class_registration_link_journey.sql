\set ON_ERROR_STOP on

begin;

update public.classes set
  published=true,
  active_unit_id='40000000-0000-0000-0000-000000000006',
  ends_on=current_date+120
where id='a0000000-0000-0000-0000-000000000001';
insert into public.class_units(class_id,unit_id,active,selected_by)
values(
  'a0000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000006',true,
  '90000000-0000-0000-0000-000000000001'
)
on conflict(class_id,unit_id) do update set active=true,archived_at=null;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
select public.teacher_open_class_registration_link(
  'a0000000-0000-0000-0000-000000000001',repeat('a',64),
  now()+interval '7 days',100
);

do $$
begin
  if has_table_privilege('authenticated','public.class_registration_links','INSERT')
    or has_table_privilege('authenticated','public.class_registration_links','UPDATE')
    or has_table_privilege('authenticated','public.class_registration_links','DELETE') then
    raise exception 'browser role retained direct registration-link write access';
  end if;
  if not exists(
    select 1 from public.class_registration_links
    where token_hash=repeat('a',64) and revoked_at is null
  ) then
    raise exception 'owning teacher could not read the open registration link';
  end if;
end $$;
reset role;

insert into auth.users(
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values(
  '00000000-0000-0000-0000-000000000000',
  '90000000-0000-0000-0000-000000000013','authenticated','authenticated',
  'registration-link-student@example.test',
  extensions.crypt('LocalOnly!26',extensions.gen_salt('bf')),now(),
  '{}','{}',now(),now()
);

set local role service_role;
select public.consume_class_registration_link(
  repeat('a',64),'90000000-0000-0000-0000-000000000013',
  'registration-link-student@example.test','Registration Link Student'
);
reset role;

do $$
begin
  if not exists(
    select 1 from public.user_profiles
    where id='90000000-0000-0000-0000-000000000013'
      and role='student'
      and organisation_id='10000000-0000-0000-0000-000000000001'
  ) then raise exception 'registration link did not create the student profile'; end if;
  if not exists(
    select 1 from public.enrolments
    where class_id='a0000000-0000-0000-0000-000000000001'
      and student_id='90000000-0000-0000-0000-000000000013'
      and archived_at is null
  ) then raise exception 'registration link did not create the class enrolment'; end if;
  if not exists(
    select 1 from public.group_learning_journeys
    where class_id='a0000000-0000-0000-0000-000000000001'
      and status='active' and archived_at is null
  ) then raise exception 'registration link did not start the approved class journey'; end if;
  if (select registration_count from public.class_registration_links where token_hash=repeat('a',64))<>1 then
    raise exception 'registration-link use count was not recorded';
  end if;
  if not exists(
    select 1 from public.audit_logs
    where action='student.registration_link_joined'
      and entity_id=(select id from public.class_registration_links where token_hash=repeat('a',64))
  ) then raise exception 'registration-link join audit fact is missing'; end if;
end $$;

insert into auth.users(
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values(
  '00000000-0000-0000-0000-000000000000',
  '90000000-0000-0000-0000-000000000015','authenticated','authenticated',
  'existing-registration@example.test',
  extensions.crypt('LocalOnly!26',extensions.gen_salt('bf')),now(),
  '{}','{}',now(),now()
);
insert into public.user_profiles(id,organisation_id,role,display_name)
values(
  '90000000-0000-0000-0000-000000000015',
  '10000000-0000-0000-0000-000000000001','student','Existing Student'
);
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000015';
set local role authenticated;
select public.student_join_class_registration_link(repeat('a',64));
reset role;

do $$
begin
  if not exists(
    select 1 from public.enrolments
    where class_id='a0000000-0000-0000-0000-000000000001'
      and student_id='90000000-0000-0000-0000-000000000015'
      and archived_at is null
  ) then raise exception 'existing student account did not join through the link'; end if;
  if (select registration_count from public.class_registration_links where token_hash=repeat('a',64))<>2 then
    raise exception 'existing-account registration was not counted';
  end if;
end $$;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
select public.teacher_close_class_registration_link(
  (select id from public.class_registration_links where token_hash=repeat('a',64)),
  'a0000000-0000-0000-0000-000000000001'
);
reset role;

insert into auth.users(
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values(
  '00000000-0000-0000-0000-000000000000',
  '90000000-0000-0000-0000-000000000014','authenticated','authenticated',
  'late-registration@example.test',
  extensions.crypt('LocalOnly!26',extensions.gen_salt('bf')),now(),
  '{}','{}',now(),now()
);
set local role service_role;
do $$
begin
  begin
    perform public.consume_class_registration_link(
      repeat('a',64),'90000000-0000-0000-0000-000000000014',
      'late-registration@example.test','Late Registration Student'
    );
    raise exception 'a closed registration link was consumed';
  exception when sqlstate '22023' then null;
  end;
end $$;
reset role;

rollback;
