-- Permanent XP earns additional coins; spending never resets earned milestones.
create function public.award_xp_coins(learner_uuid uuid)
returns void language plpgsql security definer set search_path='' as $$
declare earned bigint; issued bigint; credit integer; balance integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(learner_uuid::text));
  select coalesce(sum(points),0)/100 into earned
    from public.learner_achievement_point_events where learner_id=learner_uuid;
  select coalesce(sum(amount),0) into issued from public.coin_transactions
    where learner_id=learner_uuid and idempotency_key like 'xp-milestone:%';
  credit := greatest(earned-issued,0)::integer;
  if credit=0 then return; end if;
  select coalesce(sum(amount),0)::integer into balance from public.coin_transactions
    where learner_id=learner_uuid and transaction_status in ('posted','refunded');
  insert into public.coin_transactions(learner_id,amount,reason,description,
    idempotency_key,created_by,metadata,balance_before,balance_after,transaction_status)
  values(learner_uuid,credit,'required_learning',
    format('XP reward: 1 coin for every 100 XP (%s XP milestones reached)',earned*100),
    'xp-milestone:'||earned,learner_uuid,jsonb_build_object('xp_per_coin',100),
    balance,balance+credit,'posted');
end $$;
revoke all on function public.award_xp_coins(uuid) from public,anon,authenticated;

create function public.award_coins_on_xp() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  perform public.award_xp_coins(new.learner_id);
  return new;
end $$;
revoke all on function public.award_coins_on_xp() from public,anon,authenticated;
create trigger award_coins_on_xp after insert on public.learner_achievement_point_events
  for each row execute function public.award_coins_on_xp();

-- Existing students receive the same entitlement for XP already earned.
do $$ declare learner uuid; begin
  for learner in select distinct learner_id from public.learner_achievement_point_events loop
    perform public.award_xp_coins(learner);
  end loop;
end $$;
