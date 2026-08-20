create or replace function public.admin_update_badge_definition(
  badge_uuid uuid,
  description_value text,
  criteria_value jsonb,
  enabled_value boolean
) returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  actor public.user_profiles;
  changed integer;
begin
  select * into actor
  from public.user_profiles
  where id=auth.uid()
    and role='administrator'
    and archived_at is null;

  if actor.id is null
    or length(trim(description_value)) < 3
    or criteria_value is null
    or jsonb_typeof(criteria_value) <> 'object' then
    raise exception 'invalid_badge_configuration' using errcode='22023';
  end if;

  update public.badge_definitions
  set description=trim(description_value),
      criteria=criteria_value,
      enabled=enabled_value
  where id=badge_uuid
    and organisation_id=actor.organisation_id
    and archived_at is null;
  get diagnostics changed=row_count;

  if changed<>1 then
    raise exception 'badge_not_available' using errcode='42501';
  end if;

  insert into public.audit_logs(
    organisation_id,actor_id,action,entity_type,entity_id,after_data
  ) values (
    actor.organisation_id,actor.id,'badge.configuration_updated',
    'badge_definition',badge_uuid,
    jsonb_build_object(
      'description',trim(description_value),
      'criteria',criteria_value,
      'enabled',enabled_value
    )
  );
end $$;

create or replace function public.teacher_set_coin_rules(
  class_uuid uuid,
  rules_value jsonb
) returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  actor public.user_profiles;
  setting_uuid uuid;
begin
  select * into actor
  from public.user_profiles
  where id=auth.uid()
    and role in ('teacher','administrator')
    and archived_at is null;

  if actor.id is null
    or not public.can_manage_class(class_uuid)
    or rules_value is null
    or jsonb_typeof(rules_value)<>'object' then
    raise exception 'invalid_coin_rules' using errcode='22023';
  end if;

  if exists(
    select 1
    from jsonb_each_text(rules_value) rule
    where rule.value !~ '^[0-9]+$'
      or rule.value::integer < 0
      or rule.value::integer > 100
  ) then
    raise exception 'invalid_coin_rules' using errcode='22023';
  end if;

  insert into public.gamification_settings(
    organisation_id,class_id,learner_id,badges_enabled,coins_enabled,
    streaks_enabled,coin_rules,updated_by
  ) values (
    actor.organisation_id,class_uuid,null,true,true,true,rules_value,actor.id
  )
  on conflict(class_id) where class_id is not null
  do update set
    coin_rules=excluded.coin_rules,
    updated_by=actor.id,
    updated_at=now()
  returning id into setting_uuid;

  insert into public.audit_logs(
    organisation_id,actor_id,action,entity_type,entity_id,after_data
  ) values (
    actor.organisation_id,actor.id,'coin_rules.updated',
    'gamification_setting',setting_uuid,rules_value
  );
end $$;

revoke all on function public.admin_update_badge_definition(uuid,text,jsonb,boolean) from public;
revoke all on function public.teacher_set_coin_rules(uuid,jsonb) from public;
grant execute on function public.admin_update_badge_definition(uuid,text,jsonb,boolean) to authenticated;
grant execute on function public.teacher_set_coin_rules(uuid,jsonb) to authenticated;

