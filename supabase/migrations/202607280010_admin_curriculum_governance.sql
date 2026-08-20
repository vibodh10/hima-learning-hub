create or replace function public.admin_manage_profile(
  profile_uuid uuid,
  role_value text,
  archived_value boolean
) returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  actor public.user_profiles;
  target public.user_profiles;
begin
  select * into actor from public.user_profiles
  where id=auth.uid() and role='administrator' and archived_at is null;
  select * into target from public.user_profiles
  where id=profile_uuid and organisation_id=actor.organisation_id;

  if actor.id is null or target.id is null
    or role_value not in ('student','teacher','administrator')
    or (profile_uuid=actor.id and (archived_value or role_value<>'administrator')) then
    raise exception 'invalid_profile_management' using errcode='22023';
  end if;

  update public.user_profiles
  set role=role_value::public.app_role,
      archived_at=case when archived_value then coalesce(archived_at,now()) else null end,
      updated_at=now()
  where id=profile_uuid;

  insert into public.audit_logs(
    organisation_id,actor_id,action,entity_type,entity_id,before_data,after_data
  ) values (
    actor.organisation_id,actor.id,'profile.managed','user_profile',profile_uuid,
    jsonb_build_object('role',target.role,'archived',target.archived_at is not null),
    jsonb_build_object('role',role_value,'archived',archived_value)
  );
end $$;

create or replace function public.admin_create_academic_year(
  name_value text,
  starts_value date,
  ends_value date
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare actor public.user_profiles; created_uuid uuid;
begin
  select * into actor from public.user_profiles
  where id=auth.uid() and role='administrator' and archived_at is null;
  if actor.id is null or length(trim(name_value))<3 or ends_value<=starts_value then
    raise exception 'invalid_academic_year' using errcode='22023';
  end if;
  insert into public.academic_years(organisation_id,name,starts_on,ends_on)
  values(actor.organisation_id,trim(name_value),starts_value,ends_value)
  returning id into created_uuid;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'academic_year.created','academic_year',created_uuid,
    jsonb_build_object('name',trim(name_value),'starts_on',starts_value,'ends_on',ends_value));
  return created_uuid;
end $$;

create or replace function public.admin_archive_academic_year(
  year_uuid uuid,
  archived_value boolean
) returns void
language plpgsql
security definer
set search_path=''
as $$
declare actor public.user_profiles; changed integer;
begin
  select * into actor from public.user_profiles
  where id=auth.uid() and role='administrator' and archived_at is null;
  if actor.id is null then raise exception 'not_authorised' using errcode='42501'; end if;
  update public.academic_years
  set archived_at=case when archived_value then coalesce(archived_at,now()) else null end
  where id=year_uuid and organisation_id=actor.organisation_id;
  get diagnostics changed=row_count;
  if changed<>1 then raise exception 'year_not_available' using errcode='42501'; end if;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'academic_year.archive_changed','academic_year',year_uuid,
    jsonb_build_object('archived',archived_value));
end $$;

create or replace function public.admin_create_curriculum_version(
  course_uuid uuid,
  label_value text,
  year_value integer,
  source_value text,
  notes_value text
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare actor public.user_profiles; created_uuid uuid;
begin
  select * into actor from public.user_profiles
  where id=auth.uid() and role='administrator' and archived_at is null;
  if actor.id is null
    or length(trim(label_value))<1
    or year_value not between 2000 and 2200
    or not exists(select 1 from public.courses where id=course_uuid
      and organisation_id=actor.organisation_id and archived_at is null) then
    raise exception 'invalid_curriculum_version' using errcode='22023';
  end if;

  update public.curriculum_versions
  set active=false,archived_at=coalesce(archived_at,now())
  where course_id=course_uuid and active and archived_at is null;

  insert into public.curriculum_versions(
    course_id,version_label,specification_year,source_reference,
    teacher_notes,active
  ) values(
    course_uuid,trim(label_value),year_value,nullif(trim(source_value),''),
    nullif(trim(notes_value),''),true
  ) returning id into created_uuid;

  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'curriculum_version.created','curriculum_version',created_uuid,
    jsonb_build_object('course_id',course_uuid,'version_label',trim(label_value),
      'specification_year',year_value,'source_reference',nullif(trim(source_value),'')));
  return created_uuid;
end $$;

create or replace function public.admin_set_curriculum_version_status(
  version_uuid uuid,
  active_value boolean
) returns void
language plpgsql
security definer
set search_path=''
as $$
declare actor public.user_profiles; course_uuid uuid;
begin
  select * into actor from public.user_profiles
  where id=auth.uid() and role='administrator' and archived_at is null;
  select cv.course_id into course_uuid
  from public.curriculum_versions cv join public.courses c on c.id=cv.course_id
  where cv.id=version_uuid and c.organisation_id=actor.organisation_id;
  if actor.id is null or course_uuid is null then
    raise exception 'not_authorised' using errcode='42501';
  end if;
  if active_value then
    update public.curriculum_versions set active=false,archived_at=coalesce(archived_at,now())
    where course_id=course_uuid and id<>version_uuid and active;
  end if;
  update public.curriculum_versions
  set active=active_value,archived_at=case when active_value then null else coalesce(archived_at,now()) end
  where id=version_uuid;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'curriculum_version.status_changed',
    'curriculum_version',version_uuid,jsonb_build_object('active',active_value));
end $$;

create or replace function public.admin_set_course_status(
  course_uuid uuid,
  active_value boolean
) returns void
language plpgsql
security definer
set search_path=''
as $$
declare actor public.user_profiles; changed integer;
begin
  select * into actor from public.user_profiles
  where id=auth.uid() and role='administrator' and archived_at is null;
  if actor.id is null then raise exception 'not_authorised' using errcode='42501'; end if;
  update public.courses
  set active=active_value,
      archived_at=case when active_value then null else coalesce(archived_at,now()) end
  where id=course_uuid and organisation_id=actor.organisation_id;
  get diagnostics changed=row_count;
  if changed<>1 then raise exception 'course_not_available' using errcode='42501'; end if;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'course.status_changed','course',course_uuid,
    jsonb_build_object('active',active_value));
end $$;

revoke all on function public.admin_manage_profile(uuid,text,boolean) from public;
revoke all on function public.admin_create_academic_year(text,date,date) from public;
revoke all on function public.admin_archive_academic_year(uuid,boolean) from public;
revoke all on function public.admin_create_curriculum_version(uuid,text,integer,text,text) from public;
revoke all on function public.admin_set_curriculum_version_status(uuid,boolean) from public;
revoke all on function public.admin_set_course_status(uuid,boolean) from public;
grant execute on function public.admin_manage_profile(uuid,text,boolean) to authenticated;
grant execute on function public.admin_create_academic_year(text,date,date) to authenticated;
grant execute on function public.admin_archive_academic_year(uuid,boolean) to authenticated;
grant execute on function public.admin_create_curriculum_version(uuid,text,integer,text,text) to authenticated;
grant execute on function public.admin_set_curriculum_version_status(uuid,boolean) to authenticated;
grant execute on function public.admin_set_course_status(uuid,boolean) to authenticated;

