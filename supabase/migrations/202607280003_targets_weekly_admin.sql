-- Four-level targets, editable weekly expectations and administrator settings.

create table public.system_settings (
  organisation_id uuid primary key references public.organisations(id),
  settings jsonb not null default '{}',
  updated_by uuid references public.user_profiles(id),
  updated_at timestamptz not null default now()
);

create table public.retention_settings (
  organisation_id uuid primary key references public.organisations(id),
  learner_evidence_years integer not null default 7,
  audit_log_years integer not null default 7,
  archived_class_years integer not null default 7,
  deletion_requires_approval boolean not null default true,
  updated_by uuid references public.user_profiles(id),
  updated_at timestamptz not null default now(),
  check(learner_evidence_years between 1 and 25),
  check(audit_log_years between 1 and 25),
  check(archived_class_years between 1 and 25)
);

alter table public.system_settings enable row level security;
alter table public.retention_settings enable row level security;
create policy system_settings_admin_read on public.system_settings for select using(
  organisation_id=(select organisation_id from public.current_profile()) and public.is_admin()
);
create policy retention_settings_admin_read on public.retention_settings for select using(
  organisation_id=(select organisation_id from public.current_profile()) and public.is_admin()
);

create or replace function public.teacher_create_target(
  learner_uuid uuid,class_uuid uuid,level_value text,unit_uuid uuid,topic_uuid uuid,
  skill_uuid uuid,target_text_value text,reason_value text,evidence_value jsonb,
  starts_value date,deadline_value date,review_value date,success_value text,
  note_value text
) returns uuid language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; course_uuid uuid; created_uuid uuid;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role in ('teacher','administrator') and archived_at is null;
  select c.course_id into course_uuid from public.classes c
    where c.id=class_uuid and public.can_manage_class(c.id)
      and exists(select 1 from public.enrolments e
        where e.class_id=c.id and e.student_id=learner_uuid and e.archived_at is null);
  if actor.id is null or course_uuid is null
    or level_value not in ('weekly','topic','unit','term_semester')
    or length(trim(target_text_value))<15 or length(trim(reason_value))<5
    or length(trim(success_value))<5 or deadline_value<starts_value
    or review_value<starts_value then
    raise exception 'invalid_target' using errcode='22023';
  end if;
  if skill_uuid is not null then
    select s.topic_id,t.unit_id into topic_uuid,unit_uuid
    from public.skills s join public.topics t on t.id=s.topic_id
      join public.units u on u.id=t.unit_id
    where s.id=skill_uuid and u.course_id=course_uuid;
    if topic_uuid is null then raise exception 'invalid_target_skill' using errcode='22023'; end if;
  end if;
  if unit_uuid is not null and not exists(select 1 from public.units
      where id=unit_uuid and course_id=course_uuid) then
    raise exception 'invalid_target_unit' using errcode='22023';
  end if;
  if topic_uuid is not null and not exists(select 1 from public.topics t
      join public.units u on u.id=t.unit_id where t.id=topic_uuid and u.course_id=course_uuid) then
    raise exception 'invalid_target_topic' using errcode='22023';
  end if;
  insert into public.targets(
    learner_id,class_id,course_id,unit_id,topic_id,skill_id,level,target_text,
    reason,evidence,starts_on,target_date,review_on,success_measure,status,
    approved_by,approved_at,teacher_note
  ) values(
    learner_uuid,class_uuid,course_uuid,unit_uuid,topic_uuid,skill_uuid,level_value,
    trim(target_text_value),trim(reason_value),coalesce(evidence_value,'{}'),starts_value,
    deadline_value,review_value,trim(success_value),'active',actor.id,now(),
    nullif(trim(note_value),'')
  ) returning id into created_uuid;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'target.created','target',created_uuid,
    jsonb_build_object('learner_id',learner_uuid,'level',level_value,
      'deadline',deadline_value,'review_on',review_value));
  return created_uuid;
end $$;

create or replace function public.teacher_bulk_approve_targets(target_uuids uuid[])
returns integer language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; changed integer;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role in ('teacher','administrator') and archived_at is null;
  if actor.id is null or cardinality(target_uuids)<1 or cardinality(target_uuids)>100 then
    raise exception 'invalid_target_batch' using errcode='22023';
  end if;
  update public.targets set status='active',approved_by=actor.id,approved_at=now()
  where id=any(target_uuids) and status='proposed' and archived_at is null
    and public.can_access_learner(learner_id);
  get diagnostics changed=row_count;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,after_data)
  values(actor.organisation_id,actor.id,'targets.bulk_approved','target',
    jsonb_build_object('requested',cardinality(target_uuids),'approved',changed));
  return changed;
end $$;

create or replace function public.teacher_save_weekly_plan(
  class_uuid uuid,week_start_value date,title_value text,home_sessions_value integer,
  retrieval_value boolean,release_value timestamptz,deadline_value timestamptz
) returns uuid language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; plan_uuid uuid;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role in ('teacher','administrator') and archived_at is null;
  if actor.id is null or not public.can_manage_class(class_uuid)
    or length(trim(title_value))<3 or home_sessions_value not between 0 and 7
    or deadline_value<=release_value then
    raise exception 'invalid_weekly_plan' using errcode='22023';
  end if;
  insert into public.weekly_plans(
    class_id,week_start,title,required_home_sessions,retrieval_required,
    release_at,deadline_at,created_by
  ) values(
    class_uuid,week_start_value,trim(title_value),home_sessions_value,
    retrieval_value,release_value,deadline_value,actor.id
  ) on conflict(class_id,week_start) do update set
    title=excluded.title,required_home_sessions=excluded.required_home_sessions,
    retrieval_required=excluded.retrieval_required,release_at=excluded.release_at,
    deadline_at=excluded.deadline_at,updated_at=now(),archived_at=null
  returning id into plan_uuid;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'weekly_plan.saved','weekly_plan',plan_uuid,
    jsonb_build_object('class_id',class_uuid,'home_sessions',home_sessions_value,
      'retrieval_required',retrieval_value));
  return plan_uuid;
end $$;

create or replace function public.admin_update_settings(
  settings_value jsonb,learner_years integer,audit_years integer,
  class_years integer,deletion_approval boolean
) returns void language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role='administrator' and archived_at is null;
  if actor.id is null or learner_years not between 1 and 25
    or audit_years not between 1 and 25 or class_years not between 1 and 25 then
    raise exception 'not_authorised' using errcode='42501';
  end if;
  insert into public.system_settings(organisation_id,settings,updated_by)
  values(actor.organisation_id,coalesce(settings_value,'{}'),actor.id)
  on conflict(organisation_id) do update set
    settings=excluded.settings,updated_by=actor.id,updated_at=now();
  insert into public.retention_settings(
    organisation_id,learner_evidence_years,audit_log_years,archived_class_years,
    deletion_requires_approval,updated_by
  ) values(actor.organisation_id,learner_years,audit_years,class_years,deletion_approval,actor.id)
  on conflict(organisation_id) do update set
    learner_evidence_years=excluded.learner_evidence_years,
    audit_log_years=excluded.audit_log_years,
    archived_class_years=excluded.archived_class_years,
    deletion_requires_approval=excluded.deletion_requires_approval,
    updated_by=actor.id,updated_at=now();
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,after_data)
  values(actor.organisation_id,actor.id,'system.settings_updated','organisation',
    jsonb_build_object('retention',jsonb_build_object(
      'learner_years',learner_years,'audit_years',audit_years,'class_years',class_years,
      'deletion_requires_approval',deletion_approval)));
end $$;

revoke all on function public.teacher_create_target(uuid,uuid,text,uuid,uuid,uuid,text,text,jsonb,date,date,date,text,text) from public;
revoke all on function public.teacher_bulk_approve_targets(uuid[]) from public;
revoke all on function public.teacher_save_weekly_plan(uuid,date,text,integer,boolean,timestamptz,timestamptz) from public;
revoke all on function public.admin_update_settings(jsonb,integer,integer,integer,boolean) from public;
grant execute on function public.teacher_create_target(uuid,uuid,text,uuid,uuid,uuid,text,text,jsonb,date,date,date,text,text) to authenticated;
grant execute on function public.teacher_bulk_approve_targets(uuid[]) to authenticated;
grant execute on function public.teacher_save_weekly_plan(uuid,date,text,integer,boolean,timestamptz,timestamptz) to authenticated;
grant execute on function public.admin_update_settings(jsonb,integer,integer,integer,boolean) to authenticated;
