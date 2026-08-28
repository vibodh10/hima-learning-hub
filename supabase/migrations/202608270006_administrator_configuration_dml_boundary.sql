-- Legacy table grants predated the administrator-only configuration boundary.
-- Keep curriculum/settings readable under their existing RLS policies, but make
-- mutations available only through audited security-definer functions.

drop policy if exists learning_aims_staff_write on public.learning_aims;
drop policy if exists skills_staff_write on public.skills;
drop policy if exists teaching_screens_staff_write on public.teaching_screens;
drop policy if exists worked_examples_staff_write on public.worked_examples;
drop policy if exists weekly_plans_staff_write on public.weekly_plans;
drop policy if exists gamification_staff_write on public.gamification_settings;

revoke insert,update,delete on public.learning_aims from authenticated,anon;
revoke insert,update,delete on public.skills from authenticated,anon;
revoke insert,update,delete on public.teaching_screens from authenticated,anon;
revoke insert,update,delete on public.worked_examples from authenticated,anon;
revoke insert,update,delete on public.weekly_plans from authenticated,anon;
revoke insert,update,delete on public.weekly_plan_activities from authenticated,anon;
revoke insert,update,delete on public.gamification_settings from authenticated,anon;

create or replace function public.teacher_save_weekly_plan(
  class_uuid uuid,week_start_value date,title_value text,
  home_sessions_value integer,retrieval_value boolean,
  release_value timestamptz,deadline_value timestamptz
) returns uuid language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; plan_uuid uuid;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role='administrator' and archived_at is null;
  if actor.id is null then
    raise exception 'not_authorised' using errcode='42501';
  end if;
  if not public.can_manage_class(class_uuid)
    or week_start_value is null or length(trim(title_value))<3
    or home_sessions_value not between 0 and 7
    or release_value is null or deadline_value is null
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
    title=excluded.title,
    required_home_sessions=excluded.required_home_sessions,
    retrieval_required=excluded.retrieval_required,
    release_at=excluded.release_at,deadline_at=excluded.deadline_at,
    updated_at=now(),archived_at=null
  returning id into plan_uuid;
  insert into public.audit_logs(
    organisation_id,actor_id,action,entity_type,entity_id,after_data
  ) values(
    actor.organisation_id,actor.id,'weekly_plan.saved','weekly_plan',plan_uuid,
    jsonb_build_object(
      'class_id',class_uuid,'home_sessions',home_sessions_value,
      'retrieval_required',retrieval_value
    )
  );
  return plan_uuid;
end $$;

create or replace function public.teacher_set_gamification(
  class_uuid uuid,learner_uuid uuid,badges_value boolean,
  coins_value boolean,streaks_value boolean
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; setting_uuid uuid;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role='administrator' and archived_at is null;
  if actor.id is null then
    raise exception 'not_authorised' using errcode='42501';
  end if;
  if ((class_uuid is not null)::integer+(learner_uuid is not null)::integer)>1
    or badges_value is null or coins_value is null or streaks_value is null then
    raise exception 'invalid_setting' using errcode='22023';
  end if;
  if class_uuid is not null and not public.can_manage_class(class_uuid) then
    raise exception 'class_not_available' using errcode='42501';
  end if;
  if learner_uuid is not null and not public.can_access_learner(learner_uuid) then
    raise exception 'learner_not_available' using errcode='42501';
  end if;
  select id into setting_uuid from public.gamification_settings
  where organisation_id=actor.organisation_id
    and class_id is not distinct from class_uuid
    and learner_id is not distinct from learner_uuid;
  if setting_uuid is null then
    insert into public.gamification_settings(
      organisation_id,class_id,learner_id,badges_enabled,coins_enabled,
      streaks_enabled,updated_by
    ) values(
      actor.organisation_id,class_uuid,learner_uuid,badges_value,coins_value,
      streaks_value,actor.id
    ) returning id into setting_uuid;
  else
    update public.gamification_settings set
      badges_enabled=badges_value,coins_enabled=coins_value,
      streaks_enabled=streaks_value,updated_by=actor.id,updated_at=now()
    where id=setting_uuid;
  end if;
  insert into public.audit_logs(
    organisation_id,actor_id,action,entity_type,entity_id,after_data
  ) values(
    actor.organisation_id,actor.id,'gamification.updated',
    'gamification_setting',setting_uuid,jsonb_build_object(
      'class_id',class_uuid,'learner_id',learner_uuid,
      'badges',badges_value,'coins',coins_value,'streaks',streaks_value
    )
  );
  return setting_uuid;
end $$;

create or replace function public.teacher_set_coin_rules(
  class_uuid uuid,rules_value jsonb
) returns void
language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; setting_uuid uuid;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role='administrator' and archived_at is null;
  if actor.id is null then
    raise exception 'not_authorised' using errcode='42501';
  end if;
  if not public.can_manage_class(class_uuid) or rules_value is null
    or jsonb_typeof(rules_value)<>'object' then
    raise exception 'invalid_coin_rules' using errcode='22023';
  end if;
  if exists(
    select 1 from jsonb_each_text(rules_value) rule
    where rule.value !~ '^[0-9]+$' or rule.value::integer<0
      or rule.value::integer>100
  ) then
    raise exception 'invalid_coin_rules' using errcode='22023';
  end if;
  insert into public.gamification_settings(
    organisation_id,class_id,learner_id,badges_enabled,coins_enabled,
    streaks_enabled,coin_rules,updated_by
  ) values(
    actor.organisation_id,class_uuid,null,true,true,true,rules_value,actor.id
  ) on conflict(class_id) where class_id is not null do update set
    coin_rules=excluded.coin_rules,updated_by=actor.id,updated_at=now()
  returning id into setting_uuid;
  insert into public.audit_logs(
    organisation_id,actor_id,action,entity_type,entity_id,after_data
  ) values(
    actor.organisation_id,actor.id,'coin_rules.updated',
    'gamification_setting',setting_uuid,rules_value
  );
end $$;

comment on table public.learning_aims is
  'Curriculum configuration. Authenticated clients have no direct mutation path; future edits require an audited administrator function.';
comment on table public.skills is
  'Curriculum configuration. Authenticated clients have no direct mutation path; future edits require an audited administrator function.';
comment on table public.teaching_screens is
  'Approved teaching content. Authenticated clients have no direct mutation path; future edits require an audited administrator function.';
comment on table public.worked_examples is
  'Approved worked-example content. Authenticated clients have no direct mutation path; future edits require an audited administrator function.';
comment on table public.weekly_plans is
  'Administrator configuration mutated through teacher_save_weekly_plan, whose legacy name is retained for compatibility and whose changes are audited.';
comment on table public.weekly_plan_activities is
  'Weekly-plan membership is read-only to authenticated clients until an audited administrator mutation function is introduced.';
comment on table public.gamification_settings is
  'Administrator configuration mutated through audited settings functions; authenticated clients cannot bypass them with direct DML.';
