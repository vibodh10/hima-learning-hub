\set ON_ERROR_STOP on

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set role authenticated;
select public.teacher_set_coin_rules(
  'a0000000-0000-0000-0000-000000000001',
  '{"required_learning":4,"on_time":3,"improvement":6,"retrieval":7,"skill_mastery":12,"optional_challenge":5}'::jsonb
);
reset role;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set role authenticated;
create temporary table configured_coin_attempts(id uuid);
grant select,insert on configured_coin_attempts to authenticated;
insert into configured_coin_attempts
select (public.submit_activity(
  '72000000-0000-0000-0000-000000000002',
  '{"81000000-0000-0000-0000-000000000025":"7","81000000-0000-0000-0000-000000000026":"str, int, float","81000000-0000-0000-0000-000000000027":"distance = float(input(\"Distance: \"))","81000000-0000-0000-0000-000000000028":"7.0","81000000-0000-0000-0000-000000000029":"logic error"}'::jsonb,0
)->>'attemptId')::uuid;
select public.apply_configured_coin_rules((select id from configured_coin_attempts));
select public.apply_configured_coin_rules((select id from configured_coin_attempts));
reset role;

do $$
declare attempt_uuid uuid:=(select id from configured_coin_attempts);
begin
  if (select coalesce(sum(amount),0) from public.coin_transactions
    where source_attempt_id=attempt_uuid)<>64 then
    raise exception 'configured coin totals were not applied';
  end if;
  if (select count(*) from public.coin_transactions
    where source_attempt_id=attempt_uuid and idempotency_key like 'coin-rule-adjust:%')<>2 then
    raise exception 'configured adjustments were missing or duplicated';
  end if;
end $$;

