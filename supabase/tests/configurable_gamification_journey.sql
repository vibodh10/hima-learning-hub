\set ON_ERROR_STOP on

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set role authenticated;

select public.teacher_set_coin_rules(
  'a0000000-0000-0000-0000-000000000001',
  '{"required_learning":4,"on_time":3,"improvement":6,"retrieval":7,"skill_mastery":12,"optional_challenge":5}'::jsonb
);

reset role;
update public.user_profiles
set role='administrator'
where id='90000000-0000-0000-0000-000000000001';

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set role authenticated;

select public.admin_update_badge_definition(
  '66000000-0000-0000-0000-000000000003',
  'Practise on four separate planned learning days.',
  '{"separate_practice_days":4}'::jsonb,
  true
);

reset role;

do $$
begin
  if (
    select coin_rules->>'skill_mastery'
    from public.gamification_settings
    where class_id='a0000000-0000-0000-0000-000000000001'
  ) <> '12' then
    raise exception 'class coin rules were not saved';
  end if;

  if not exists(
    select 1
    from public.badge_definitions
    where id='66000000-0000-0000-0000-000000000003'
      and criteria='{"separate_practice_days":4}'::jsonb
      and enabled
  ) then
    raise exception 'badge criteria were not updated';
  end if;

  if not exists(select 1 from public.audit_logs where action='coin_rules.updated')
    or not exists(select 1 from public.audit_logs where action='badge.configuration_updated') then
    raise exception 'gamification configuration audit evidence is missing';
  end if;
end $$;

