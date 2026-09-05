\set ON_ERROR_STOP on

-- Staff simulations remain in the sandbox and reset without touching learner
-- evidence, coins, badges, targets or purchases.
create temporary table safe_baseline as
select
  (select count(*) from public.attempts where learner_id='90000000-0000-0000-0000-000000000002') attempts,
  (select count(*) from public.targets where learner_id='90000000-0000-0000-0000-000000000002') targets,
  (select count(*) from public.badge_awards where learner_id='90000000-0000-0000-0000-000000000002') badges,
  (select count(*) from public.coin_transactions where learner_id='90000000-0000-0000-0000-000000000002') coins,
  (select count(*) from public.reward_purchases where learner_id='90000000-0000-0000-0000-000000000002') purchases;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set role authenticated;
select public.record_test_mode_event('simulated_percentage','{"percentage":90}');
select public.record_test_mode_event('badge_awarded','{"badge":"Python Explorer"}');
select public.record_test_mode_event('coins_awarded','{"coins":50}');
do $$ begin
  if public.reset_test_mode()<>3 then raise exception 'test reset did not remove only sandbox events';end if;
end $$;
reset role;

do $$ begin
  if exists(select 1 from public.test_mode_events) then raise exception 'test events survived reset';end if;
  if (select count(*) from public.attempts where learner_id='90000000-0000-0000-0000-000000000002')<>(select attempts from safe_baseline)
    or (select count(*) from public.targets where learner_id='90000000-0000-0000-0000-000000000002')<>(select targets from safe_baseline)
    or (select count(*) from public.badge_awards where learner_id='90000000-0000-0000-0000-000000000002')<>(select badges from safe_baseline)
    or (select count(*) from public.coin_transactions where learner_id='90000000-0000-0000-0000-000000000002')<>(select coins from safe_baseline)
    or (select count(*) from public.reward_purchases where learner_id='90000000-0000-0000-0000-000000000002')<>(select purchases from safe_baseline)
  then raise exception 'test mode contaminated a real learner record';end if;
end $$;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set role authenticated;
do $$ begin
  begin
    perform public.record_test_mode_event('student_skip','{}');
    raise exception 'student accessed test mode';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- The default Python journey enforces Guided -> Core -> Mastery and keeps the
-- retention check scheduled.
delete from public.attempt_answers where attempt_id in(
  select id from public.attempts where learner_id='90000000-0000-0000-0000-000000000002'
    and activity_id between '71000000-0000-0000-0000-000000000001' and '71000000-0000-0000-0000-000000000005'
);
delete from public.attempts where learner_id='90000000-0000-0000-0000-000000000002'
  and activity_id between '71000000-0000-0000-0000-000000000001' and '71000000-0000-0000-0000-000000000005';

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set role authenticated;
do $$ begin
  if (select state from public.learner_activity_states('61000000-0000-0000-0000-000000000001') where activity_id='71000000-0000-0000-0000-000000000001')<>'Available'
    or (select state from public.learner_activity_states('61000000-0000-0000-0000-000000000001') where activity_id='71000000-0000-0000-0000-000000000002')<>'Locked'
    or (select state from public.learner_activity_states('61000000-0000-0000-0000-000000000001') where activity_id='71000000-0000-0000-0000-000000000003')<>'Locked'
    or (select state from public.learner_activity_states('61000000-0000-0000-0000-000000000001') where activity_id='71000000-0000-0000-0000-000000000004')<>'Locked'
    or (select state from public.learner_activity_states('61000000-0000-0000-0000-000000000001') where activity_id='71000000-0000-0000-0000-000000000005')<>'Scheduled'
  then raise exception 'fresh learner sequence is incorrect';end if;
  perform public.submit_activity('71000000-0000-0000-0000-000000000001','{}',0);
  if (select state from public.learner_activity_states('61000000-0000-0000-0000-000000000001') where activity_id='71000000-0000-0000-0000-000000000002')<>'Available'
  then raise exception 'core did not unlock after guided';end if;
  perform public.submit_activity('71000000-0000-0000-0000-000000000002','{}',0);
  if (select state from public.learner_activity_states('61000000-0000-0000-0000-000000000001') where activity_id='71000000-0000-0000-0000-000000000004')<>'Available'
  then raise exception 'mastery did not unlock after core';end if;
  if (select state from public.learner_activity_states('61000000-0000-0000-0000-000000000001') where activity_id='71000000-0000-0000-0000-000000000003')<>'Available'
  then raise exception 'optional challenge did not unlock after core';end if;
  perform public.submit_activity(
    '71000000-0000-0000-0000-000000000004',
    '{"81000000-0000-0000-0000-000000000025":"7","81000000-0000-0000-0000-000000000026":"str, int, float","81000000-0000-0000-0000-000000000027":"distance = float(input(\"Distance: \"))","81000000-0000-0000-0000-000000000028":"7.0","81000000-0000-0000-0000-000000000029":"logic error"}',
    0
  );
  if (select state from public.learner_activity_states('61000000-0000-0000-0000-000000000001') where activity_id='72000000-0000-0000-0000-000000000003')<>'Available'
  then raise exception 'progress point did not unlock after mastery';end if;
  if (select state from public.learner_activity_states('61000000-0000-0000-0000-000000000001') where activity_id='72000000-0000-0000-0000-000000000004')<>'Scheduled'
    or (select available_on from public.learner_activity_states('61000000-0000-0000-0000-000000000001') where activity_id='72000000-0000-0000-0000-000000000004')<>current_date+7
  then raise exception 'official retention check did not inherit the delayed schedule';end if;
end $$;
reset role;

-- Purchase, ledger and equipment are one transaction; duplicate and failed
-- purchases leave the balance unchanged.
insert into public.coin_transactions(
  learner_id,amount,reason,description,idempotency_key,created_by
) values(
  '90000000-0000-0000-0000-000000000002',50,'teacher_correction',
  'Safe journey opening balance','safe-journey-opening-balance',
  '90000000-0000-0000-0000-000000000001'
);
insert into public.reward_items(
  id,organisation_id,code,title,description,kind,price,asset_config
) values(
  '67ffffff-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'safe-journey-expensive','Unbuyable test theme',
  'Used only to prove failed purchases preserve coins.',
  'profile_theme',100000,'{"theme":"test"}'
);
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set role authenticated;
create temporary table safe_purchase as
select public.purchase_reward_v2('67000000-0000-0000-0000-000000000001') payload;
do $$
declare before_balance integer;
begin
  if not coalesce((select (payload->>'equipped')::boolean from safe_purchase),false)
  then raise exception 'purchase response did not report immediate equipment';end if;
  if not exists(select 1 from public.reward_purchases where learner_id=auth.uid()
    and reward_id='67000000-0000-0000-0000-000000000001'
    and purchase_status='completed' and equipped_at is not null)
  then raise exception 'purchased theme was not owned and equipped';end if;
  if not exists(select 1 from public.coin_transactions where learner_id=auth.uid()
    and reason='reward_purchase' and amount=-40 and balance_after=balance_before-40
    and transaction_status='posted')
  then raise exception 'purchase ledger lacks before/after posted balance';end if;
  select coalesce(sum(amount),0) into before_balance from public.coin_transactions where learner_id=auth.uid() and transaction_status='posted';
  begin
    perform public.purchase_reward_v2('67000000-0000-0000-0000-000000000001');
    raise exception 'duplicate purchase succeeded';
  exception when unique_violation then null;
  end;
  begin
    perform public.purchase_reward_v2('67ffffff-0000-0000-0000-000000000001');
    raise exception 'insufficient purchase succeeded';
  exception when invalid_parameter_value then null;
  end;
  if (select coalesce(sum(amount),0) from public.coin_transactions where learner_id=auth.uid() and transaction_status='posted')<>before_balance
  then raise exception 'failed purchase changed the balance';end if;
end $$;
select public.equip_reward((payload->>'purchaseId')::uuid,false) from safe_purchase;
do $$ begin
  if exists(select 1 from public.reward_purchases where learner_id=auth.uid()
    and reward_id='67000000-0000-0000-0000-000000000001' and equipped_at is not null)
  then raise exception 'owned theme could not be unequipped';end if;
end $$;
select public.equip_reward((payload->>'purchaseId')::uuid,true) from safe_purchase;
reset role;

create temporary table reconciliation_balance as
select public.coin_balance('90000000-0000-0000-0000-000000000002') amount;
insert into public.coin_transactions(
  learner_id,amount,reason,description,idempotency_key,created_by,metadata,
  balance_before,balance_after,transaction_status
) select
  '90000000-0000-0000-0000-000000000002',-5,'reward_purchase',
  'Historic incomplete purchase','safe-incomplete-purchase',
  '90000000-0000-0000-0000-000000000002','{"reward_id":"67ffffff-0000-0000-0000-000000000001"}',
  amount,amount-5,'posted'
from reconciliation_balance;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set role authenticated;
do $$ begin
  if public.reconcile_incomplete_reward_purchases('90000000-0000-0000-0000-000000000002')<>1
  then raise exception 'incomplete purchase was not reconciled';end if;
end $$;
reset role;

do $$ begin
  if public.coin_balance('90000000-0000-0000-0000-000000000002')<>(select amount from reconciliation_balance)
  then raise exception 'reconciliation did not restore the exact balance';end if;
  if not exists(select 1 from public.coin_transactions
    where idempotency_key='safe-incomplete-purchase' and transaction_status='refunded')
    or not exists(select 1 from public.coin_transactions
      where idempotency_key like 'reward-reconciliation:%' and reason='refund'
        and amount=5 and transaction_status='posted')
  then raise exception 'reconciliation status or refund ledger entry is missing';end if;
end $$;

select 'safe testing, sequencing and rewards journey passed' result;
