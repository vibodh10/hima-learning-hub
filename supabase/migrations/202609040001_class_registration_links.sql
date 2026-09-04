-- College mail filters can prevent invitation delivery. Provide a controlled
-- class registration link that staff can open, replace and close without
-- exposing the legacy class enrolment code or permitting open registration.

create table public.class_registration_links (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  class_id uuid not null references public.classes(id),
  token_hash text not null unique,
  created_by uuid not null references public.user_profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  max_registrations integer not null default 100,
  registration_count integer not null default 0,
  revoked_at timestamptz,
  check(token_hash ~ '^[0-9a-f]{64}$'),
  check(expires_at>created_at),
  check(max_registrations between 1 and 500),
  check(registration_count between 0 and max_registrations)
);

create unique index class_registration_links_one_open_per_class
  on public.class_registration_links(class_id)
  where revoked_at is null;
create index class_registration_links_class_history
  on public.class_registration_links(class_id,created_at desc);

alter table public.class_registration_links enable row level security;
revoke all on public.class_registration_links from anon,authenticated;
grant select on public.class_registration_links to authenticated;

create policy class_registration_links_staff_read
on public.class_registration_links
for select
to authenticated
using (public.can_manage_class(class_id));

create or replace function public.current_class_registration_link(class_uuid uuid)
returns table(
  id uuid,
  created_at timestamptz,
  expires_at timestamptz,
  max_registrations integer,
  registration_count integer
)
language sql
stable
security definer
set search_path=''
as $$
  select link.id,link.created_at,link.expires_at,
    link.max_registrations,link.registration_count
  from public.class_registration_links link
  where link.class_id=class_uuid
    and link.revoked_at is null
    and link.expires_at>now()
    and link.registration_count<link.max_registrations
    and public.can_manage_class(class_uuid)
  order by link.created_at desc
  limit 1
$$;

create or replace function public.teacher_open_class_registration_link(
  class_uuid uuid,
  token_hash_value text,
  expires_at_value timestamptz,
  max_registrations_value integer default 100
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  actor public.user_profiles;
  selected_class public.classes;
  created_uuid uuid;
begin
  actor:=public.current_profile();
  if actor.id is null or actor.role not in ('teacher','administrator')
    or not public.can_manage_class(class_uuid) then
    raise exception 'not_authorised' using errcode='42501';
  end if;
  if token_hash_value is null or token_hash_value !~ '^[0-9a-f]{64}$'
    or expires_at_value is null
    or expires_at_value<now()+interval '15 minutes'
    or expires_at_value>now()+interval '30 days'
    or max_registrations_value not between 1 and 500 then
    raise exception 'invalid_registration_link' using errcode='22023';
  end if;

  select class.* into selected_class
  from public.classes class
  where class.id=class_uuid
    and class.organisation_id=actor.organisation_id
    and class.archived_at is null
  for update;
  if selected_class.id is null
    or not selected_class.published
    or selected_class.active_unit_id is null
    or (selected_class.ends_on is not null and selected_class.ends_on<current_date)
    or not exists(
      select 1
      from public.class_units class_unit
      join public.units unit on unit.id=class_unit.unit_id
      join public.learning_journey_templates template on template.unit_id=unit.id
      where class_unit.class_id=selected_class.id
        and class_unit.unit_id=selected_class.active_unit_id
        and class_unit.active
        and class_unit.archived_at is null
        and unit.status='approved'
        and unit.archived_at is null
        and template.status='approved'
        and template.archived_at is null
    ) then
    raise exception 'class_not_registration_ready' using errcode='22023';
  end if;

  update public.class_registration_links
  set revoked_at=now()
  where class_id=selected_class.id and revoked_at is null;

  insert into public.class_registration_links(
    organisation_id,class_id,token_hash,created_by,expires_at,max_registrations
  ) values(
    actor.organisation_id,selected_class.id,token_hash_value,actor.id,
    expires_at_value,max_registrations_value
  ) returning id into created_uuid;

  insert into public.audit_logs(
    organisation_id,actor_id,action,entity_type,entity_id,after_data
  ) values(
    actor.organisation_id,actor.id,'class.registration_link_opened',
    'class_registration_link',created_uuid,
    jsonb_build_object(
      'class_id',selected_class.id,
      'expires_at',expires_at_value,
      'max_registrations',max_registrations_value
    )
  );
  return created_uuid;
end;
$$;

create or replace function public.teacher_close_class_registration_link(
  link_uuid uuid,
  class_uuid uuid
) returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  actor public.user_profiles;
  closed boolean:=false;
begin
  actor:=public.current_profile();
  if actor.id is null or actor.role not in ('teacher','administrator')
    or not public.can_manage_class(class_uuid) then
    raise exception 'not_authorised' using errcode='42501';
  end if;

  update public.class_registration_links
  set revoked_at=now()
  where id=link_uuid
    and class_id=class_uuid
    and organisation_id=actor.organisation_id
    and revoked_at is null;
  closed:=found;

  if closed then
    insert into public.audit_logs(
      organisation_id,actor_id,action,entity_type,entity_id,after_data
    ) values(
      actor.organisation_id,actor.id,'class.registration_link_closed',
      'class_registration_link',link_uuid,jsonb_build_object('class_id',class_uuid)
    );
  end if;
  return closed;
end;
$$;

create or replace function public.consume_class_registration_link(
  token_hash_value text,
  student_uuid uuid,
  email_value text,
  display_name_value text
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  selected_link public.class_registration_links;
  selected_class public.classes;
  selected_template public.learning_journey_templates;
  existing_profile public.user_profiles;
  auth_email text;
  journey_uuid uuid;
  already_enrolled boolean:=false;
begin
  if token_hash_value is null or token_hash_value !~ '^[0-9a-f]{64}$'
    or student_uuid is null
    or email_value is null
    or display_name_value is null
    or length(trim(display_name_value)) not between 2 and 100 then
    raise exception 'invalid_registration' using errcode='22023';
  end if;

  select link.* into selected_link
  from public.class_registration_links link
  where link.token_hash=token_hash_value
  for update;
  if selected_link.id is null
    or selected_link.revoked_at is not null
    or selected_link.expires_at<=now()
    or selected_link.registration_count>=selected_link.max_registrations then
    raise exception 'registration_link_unavailable' using errcode='22023';
  end if;

  select class.* into selected_class
  from public.classes class
  where class.id=selected_link.class_id
    and class.organisation_id=selected_link.organisation_id
    and class.archived_at is null
    and class.published
    and class.active_unit_id is not null
    and (class.ends_on is null or class.ends_on>=current_date)
  for update;
  if selected_class.id is null then
    raise exception 'registration_link_unavailable' using errcode='22023';
  end if;

  select lower(trim(auth_user.email)) into auth_email
  from auth.users auth_user
  where auth_user.id=student_uuid;
  if auth_email is null or auth_email<>lower(trim(email_value)) then
    raise exception 'registration_account_mismatch' using errcode='42501';
  end if;
  select profile.* into existing_profile
  from public.user_profiles profile
  where profile.id=student_uuid;
  if existing_profile.id is not null and (
    existing_profile.organisation_id<>selected_link.organisation_id
    or existing_profile.role<>'student'
    or existing_profile.archived_at is not null
  ) then
    raise exception 'registration_profile_conflict' using errcode='22023';
  end if;

  select template.* into selected_template
  from public.class_units class_unit
  join public.units unit on unit.id=class_unit.unit_id
  join public.learning_journey_templates template on template.unit_id=unit.id
  where class_unit.class_id=selected_class.id
    and class_unit.unit_id=selected_class.active_unit_id
    and class_unit.active
    and class_unit.archived_at is null
    and unit.status='approved'
    and unit.archived_at is null
    and template.status='approved'
    and template.archived_at is null
  order by template.version_number desc,template.approved_at desc nulls last
  limit 1;
  if selected_template.id is null then
    raise exception 'registration_link_unavailable' using errcode='22023';
  end if;

  select exists(
    select 1 from public.enrolments enrolment
    where enrolment.class_id=selected_class.id
      and enrolment.student_id=student_uuid
      and enrolment.archived_at is null
  ) into already_enrolled;
  if existing_profile.id is null then
    insert into public.user_profiles(id,organisation_id,role,display_name)
    values(student_uuid,selected_link.organisation_id,'student',trim(display_name_value));
  end if;
  insert into public.enrolments(class_id,student_id)
  values(selected_class.id,student_uuid)
  on conflict(class_id,student_id) do update set archived_at=null;
  if not already_enrolled then
    update public.class_registration_links
    set registration_count=registration_count+1
    where id=selected_link.id;
  end if;

  if not exists(
    select 1 from public.group_learning_journeys journey
    where journey.class_id=selected_class.id and journey.archived_at is null
  ) then
    begin
      insert into public.group_learning_journeys(
        class_id,template_id,unit_id,started_by,settings
      ) values(
        selected_class.id,selected_template.id,selected_template.unit_id,
        selected_link.created_by,
        jsonb_build_object(
          'start_mode','automatic_first_registration_link_join',
          'registration_link_id',selected_link.id
        )
      ) returning id into journey_uuid;
    exception when unique_violation then
      journey_uuid:=null;
    end;
    if journey_uuid is not null then
      insert into public.audit_logs(
        organisation_id,actor_id,action,entity_type,entity_id,after_data
      ) values(
        selected_link.organisation_id,selected_link.created_by,
        'group_journey.auto_started','group_learning_journey',journey_uuid,
        jsonb_build_object(
          'class_id',selected_class.id,
          'template_id',selected_template.id,
          'unit_id',selected_template.unit_id,
          'registration_link_id',selected_link.id,
          'learner_id',student_uuid,
          'total_teaching_weeks',selected_template.total_teaching_weeks
        )
      );
    end if;
  end if;

  insert into public.audit_logs(
    organisation_id,actor_id,action,entity_type,entity_id,after_data
  ) values(
    selected_link.organisation_id,student_uuid,'student.registration_link_joined',
    'class_registration_link',selected_link.id,
    jsonb_build_object('class_id',selected_class.id,'student_id',student_uuid)
  );
  return selected_class.id;
end;
$$;

create or replace function public.student_join_class_registration_link(
  token_hash_value text
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  actor public.user_profiles;
  actor_email text;
begin
  actor:=public.current_profile();
  if actor.id is null or actor.role<>'student' then
    raise exception 'student_required' using errcode='42501';
  end if;
  select auth_user.email into actor_email
  from auth.users auth_user
  where auth_user.id=actor.id;
  if actor_email is null then
    raise exception 'student_email_missing' using errcode='42501';
  end if;
  return public.consume_class_registration_link(
    token_hash_value,actor.id,actor_email,actor.display_name
  );
end;
$$;

revoke all on function public.teacher_open_class_registration_link(uuid,text,timestamptz,integer)
  from public,anon;
revoke all on function public.teacher_close_class_registration_link(uuid,uuid)
  from public,anon;
revoke all on function public.consume_class_registration_link(text,uuid,text,text)
  from public,anon,authenticated;
revoke all on function public.student_join_class_registration_link(text)
  from public,anon;
revoke all on function public.current_class_registration_link(uuid)
  from public,anon;
grant execute on function public.teacher_open_class_registration_link(uuid,text,timestamptz,integer)
  to authenticated;
grant execute on function public.teacher_close_class_registration_link(uuid,uuid)
  to authenticated;
grant execute on function public.consume_class_registration_link(text,uuid,text,text)
  to service_role;
grant execute on function public.student_join_class_registration_link(text)
  to authenticated;
grant execute on function public.current_class_registration_link(uuid)
  to authenticated;

comment on table public.class_registration_links is
  'Short-lived, teacher-controlled class registration links. Only a SHA-256 token digest is stored; direct browser writes are prohibited.';
comment on function public.consume_class_registration_link(text,uuid,text,text) is
  'Atomically validates one open class registration link, creates the student profile and enrolment, starts the approved class journey when required, and records audit facts. Service role only.';
