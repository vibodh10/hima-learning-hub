-- A visual reward should visibly apply as part of a successful purchase. Keep
-- one equipped item per reward kind and preserve the existing ledger safety.

create or replace function public.purchase_reward_v2(reward_uuid uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  actor public.user_profiles;
  reward public.reward_items;
  balance integer;
  transaction_uuid uuid;
  purchase_uuid uuid;
begin
  actor:=public.current_profile();
  if actor.role<>'student' then
    raise exception 'not_authorised' using errcode='42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(actor.id::text));
  select * into reward from public.reward_items
  where id=reward_uuid
    and organisation_id=actor.organisation_id
    and enabled
    and archived_at is null;
  if reward.id is null then
    raise exception 'reward_unavailable' using errcode='22023';
  end if;
  if exists(
    select 1 from public.reward_purchases
    where learner_id=actor.id
      and reward_id=reward.id
      and purchase_status='completed'
  ) then
    raise exception 'already_owned' using errcode='23505';
  end if;

  balance:=public.coin_balance(actor.id);
  if balance<reward.price then
    raise exception 'insufficient_coins' using errcode='22023';
  end if;

  insert into public.coin_transactions(
    learner_id,amount,reason,description,idempotency_key,created_by,metadata,
    balance_before,balance_after,transaction_status
  ) values(
    actor.id,-reward.price,'reward_purchase',
    pg_catalog.format('Purchased cosmetic reward: %s',reward.title),
    pg_catalog.format('reward:%s',reward.id),actor.id,
    pg_catalog.jsonb_build_object('reward_id',reward.id),
    balance,balance-reward.price,'posted'
  ) returning id into transaction_uuid;

  update public.reward_purchases purchase
  set equipped_at=null
  where purchase.learner_id=actor.id
    and purchase.equipped_at is not null
    and exists(
      select 1 from public.reward_items item
      where item.id=purchase.reward_id and item.kind=reward.kind
    );

  insert into public.reward_purchases(
    learner_id,reward_id,price_paid,coin_transaction_id,purchase_status,equipped_at
  ) values(
    actor.id,reward.id,reward.price,transaction_uuid,'completed',pg_catalog.now()
  ) returning id into purchase_uuid;

  insert into public.audit_logs(
    organisation_id,actor_id,action,entity_type,entity_id,after_data
  ) values(
    actor.organisation_id,actor.id,'reward.purchased','reward_purchase',purchase_uuid,
    pg_catalog.jsonb_build_object(
      'reward_id',reward.id,'price',reward.price,'equipped',true,
      'balance_before',balance,'balance_after',balance-reward.price
    )
  );

  return pg_catalog.jsonb_build_object(
    'purchaseId',purchase_uuid,'rewardId',reward.id,'title',reward.title,
    'kind',reward.kind,'description',reward.description,'price',reward.price,
    'owned',true,'equipped',true,'assetConfig',reward.asset_config,
    'balance',balance-reward.price
  );
exception when unique_violation then
  raise exception 'already_owned' using errcode='23505';
end;
$$;

revoke all on function public.purchase_reward_v2(uuid) from public,anon;
grant execute on function public.purchase_reward_v2(uuid) to authenticated;
