\set ON_ERROR_STOP on

update public.user_profiles
set role='administrator'
where id='90000000-0000-0000-0000-000000000001';

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set role authenticated;

select public.admin_manage_profile(
  '90000000-0000-0000-0000-000000000002','student',false
);

create temporary table admin_governance_ids(label text primary key,id uuid);
grant select,insert on admin_governance_ids to authenticated;
insert into admin_governance_ids values(
  'year',public.admin_create_academic_year('2030/31','2030-09-01','2031-07-31')
);
insert into admin_governance_ids values(
  'version',public.admin_create_curriculum_version(
    '30000000-0000-0000-0000-000000000001',
    'Governance Test 2030',2030,'https://example.invalid/specification',
    'Integration-test version'
  )
);

select public.admin_archive_academic_year(
  (select id from admin_governance_ids where label='year'),true
);
select public.admin_set_curriculum_version_status(
  (select id from admin_governance_ids where label='version'),false
);
select public.admin_set_course_status(
  '30000000-0000-0000-0000-000000000002',false
);
select public.admin_set_course_status(
  '30000000-0000-0000-0000-000000000002',true
);

reset role;

do $$
begin
  if not exists(
    select 1 from public.academic_years
    where id=(select id from admin_governance_ids where label='year')
      and archived_at is not null
  ) then raise exception 'academic year lifecycle failed'; end if;

  if not exists(
    select 1 from public.curriculum_versions
    where id=(select id from admin_governance_ids where label='version')
      and not active and archived_at is not null
  ) then raise exception 'curriculum version lifecycle failed'; end if;

  if not exists(
    select 1 from public.courses
    where id='30000000-0000-0000-0000-000000000002'
      and active and archived_at is null
  ) then raise exception 'course restore failed'; end if;

  if (select count(*) from public.audit_logs where action in (
    'profile.managed','academic_year.created','academic_year.archive_changed',
    'curriculum_version.created','curriculum_version.status_changed',
    'course.status_changed'
  )) < 7 then raise exception 'admin governance audit evidence is incomplete'; end if;
end $$;

