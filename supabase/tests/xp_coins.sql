begin;
do $$
declare learner uuid; rule uuid; starting_balance integer; total bigint;
begin
  select id into learner from public.user_profiles p where role='student'
    and not exists(select 1 from public.learner_achievement_point_events e where e.learner_id=p.id) limit 1;
  if learner is null then raise exception 'Fixture requires a student without XP'; end if;
  select id into rule from public.achievement_point_rules
    where organisation_id=(select organisation_id from public.user_profiles where id=learner) limit 1;
  select coalesce(sum(amount),0) into starting_balance from public.coin_transactions
    where learner_id=learner and transaction_status in ('posted','refunded');
  insert into public.learner_achievement_point_events(learner_id,rule_id,points,source_type,idempotency_key,description)
    values(learner,rule,99,'progress','xp-test-99','Test XP');
  if exists(select 1 from public.coin_transactions where learner_id=learner and idempotency_key like 'xp-milestone:%') then raise exception 'Coin before 100 XP'; end if;
  insert into public.learner_achievement_point_events(learner_id,rule_id,points,source_type,idempotency_key,description)
    values(learner,rule,1,'progress','xp-test-100','Test XP');
  perform public.award_xp_coins(learner);
  if (select sum(amount) from public.coin_transactions where learner_id=learner and idempotency_key like 'xp-milestone:%')<>1 then raise exception '100 XP or idempotence failed'; end if;
  insert into public.coin_transactions(learner_id,amount,reason,description,idempotency_key,created_by)
    values(learner,-1,'reward_purchase','Test spending','xp-test-spend',learner);
  perform public.award_xp_coins(learner);
  if (select sum(amount) from public.coin_transactions where learner_id=learner and idempotency_key like 'xp-milestone:%')<>1 then raise exception 'Spent coin reissued'; end if;
  insert into public.learner_achievement_point_events(learner_id,rule_id,points,source_type,idempotency_key,description)
    values(learner,rule,150,'progress','xp-test-250','Test XP');
  select sum(points) into total from public.learner_achievement_point_events where learner_id=learner;
  if total<>250 then raise exception 'XP was spent'; end if;
  if (select sum(amount) from public.coin_transactions where learner_id=learner and idempotency_key like 'xp-milestone:%')<>2 then raise exception '250 XP did not earn 2 coins'; end if;
  if has_function_privilege('authenticated','public.award_xp_coins(uuid)','execute') then raise exception 'Student can call award function'; end if;
end $$;
rollback;
