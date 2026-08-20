-- A refunded debit remains part of the historical running balance; its posted
-- refund credit restores the learner. Only reversed entries are excluded.

create or replace function public.coin_balance(learner_uuid uuid default auth.uid())
returns integer language sql stable security definer set search_path=''
as $$
  select case when public.can_access_learner(learner_uuid)
    then coalesce((select sum(amount)::integer
      from public.coin_transactions
      where learner_id=learner_uuid
        and transaction_status in ('posted','refunded')),0)
    else null end
$$;

create or replace function public.purchase_reward_v2(reward_uuid uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare actor public.user_profiles; reward public.reward_items; balance integer;
  transaction_uuid uuid; purchase_uuid uuid;
begin
  actor:=public.current_profile();
  if actor.role<>'student' then raise exception 'not_authorised' using errcode='42501';end if;
  perform pg_advisory_xact_lock(hashtext(actor.id::text));
  select * into reward from public.reward_items where id=reward_uuid
    and organisation_id=actor.organisation_id and enabled and archived_at is null;
  if reward.id is null then raise exception 'reward_unavailable' using errcode='22023';end if;
  if exists(select 1 from public.reward_purchases where learner_id=actor.id
    and reward_id=reward.id and purchase_status='completed') then
    raise exception 'already_owned' using errcode='23505';
  end if;
  balance:=public.coin_balance(actor.id);
  if balance<reward.price then raise exception 'insufficient_coins' using errcode='22023';end if;
  insert into public.coin_transactions(
    learner_id,amount,reason,description,idempotency_key,created_by,metadata,
    balance_before,balance_after,transaction_status
  ) values(actor.id,-reward.price,'reward_purchase',
    format('Purchased cosmetic reward: %s',reward.title),
    format('reward:%s',reward.id),actor.id,jsonb_build_object('reward_id',reward.id),
    balance,balance-reward.price,'posted') returning id into transaction_uuid;
  insert into public.reward_purchases(
    learner_id,reward_id,price_paid,coin_transaction_id,purchase_status
  ) values(actor.id,reward.id,reward.price,transaction_uuid,'completed')
  returning id into purchase_uuid;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'reward.purchased','reward_purchase',purchase_uuid,
    jsonb_build_object('reward_id',reward.id,'price',reward.price,
      'balance_before',balance,'balance_after',balance-reward.price));
  return jsonb_build_object('purchaseId',purchase_uuid,'rewardId',reward.id,
    'title',reward.title,'kind',reward.kind,'description',reward.description,
    'price',reward.price,'owned',true,'equipped',false,
    'assetConfig',reward.asset_config,'balance',balance-reward.price);
exception when unique_violation then
  raise exception 'already_owned' using errcode='23505';
end;
$$;

create or replace function public.reconcile_incomplete_reward_purchases(
  learner_uuid uuid default null
) returns integer language plpgsql security definer set search_path=public
as $$
declare actor public.user_profiles; row_data record; refunded integer:=0; balance integer;
begin
  actor:=public.current_profile();
  if actor.role not in ('teacher','administrator') then
    raise exception 'not_authorised' using errcode='42501';
  end if;
  for row_data in
    select ct.* from public.coin_transactions ct
    join public.user_profiles p on p.id=ct.learner_id
    where ct.reason='reward_purchase' and ct.amount<0
      and ct.transaction_status='posted'
      and p.organisation_id=actor.organisation_id
      and (learner_uuid is null or ct.learner_id=learner_uuid)
      and not exists(select 1 from public.reward_purchases rp
        where rp.coin_transaction_id=ct.id and rp.purchase_status='completed')
  loop
    perform pg_advisory_xact_lock(hashtext(row_data.learner_id::text));
    balance:=public.coin_balance(row_data.learner_id);
    insert into public.coin_transactions(
      learner_id,amount,reason,description,corrected_transaction_id,
      idempotency_key,created_by,metadata,balance_before,balance_after
    ) values(row_data.learner_id,-row_data.amount,'refund',
      'Refund for incomplete cosmetic reward purchase.',row_data.id,
      format('reward-reconciliation:%s',row_data.id),actor.id,
      jsonb_build_object('original_transaction_id',row_data.id),
      balance,balance-row_data.amount)
    on conflict(learner_id,idempotency_key) do nothing;
    if found then
      update public.coin_transactions set transaction_status='refunded'
        where id=row_data.id;
      refunded:=refunded+1;
    end if;
  end loop;
  if refunded>0 then
    insert into public.audit_logs(organisation_id,actor_id,action,entity_type,after_data)
    values(actor.organisation_id,actor.id,'reward_purchase.reconciled',
      'coin_transaction',jsonb_build_object('refunds',refunded,'learner_id',learner_uuid));
  end if;
  return refunded;
end;
$$;

revoke all on function public.coin_balance(uuid) from public,anon;
grant execute on function public.coin_balance(uuid) to authenticated;
