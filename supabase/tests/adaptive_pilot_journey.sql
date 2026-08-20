\set ON_ERROR_STOP on
create temporary table adaptive_test_results(label text primary key,payload jsonb);
create temporary table adaptive_test_ids(label text primary key,id uuid);
grant select,insert on adaptive_test_results,adaptive_test_ids to authenticated;

-- Execute as the fictional enrolled learner through the same authenticated role
-- used by Supabase PostgREST.
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set role authenticated;

insert into adaptive_test_results(label,payload)
select 'first',public.submit_activity(
  '71000000-0000-0000-0000-000000000001',
  '{
    "81000000-0000-0000-0000-000000000001":"7",
    "81000000-0000-0000-0000-000000000002":"int",
    "81000000-0000-0000-0000-000000000003":"int",
    "81000000-0000-0000-0000-000000000004":"10",
    "81000000-0000-0000-0000-000000000005":".2f",
    "81000000-0000-0000-0000-000000000006":"age is a string"
  }'::jsonb,
  0
);

reset role;

do $$
declare
  learner constant uuid := '90000000-0000-0000-0000-000000000002';
  result jsonb := (select payload from adaptive_test_results where label='first');
begin
  if (result->>'percentage')::numeric <> 100 then
    raise exception 'adaptive first submission did not score 100';
  end if;
  if jsonb_array_length(result->'skillMastery') <> 6 then
    raise exception 'expected six skill mastery updates';
  end if;
  if (select count(*) from public.attempts where learner_id=learner
      and activity_id='71000000-0000-0000-0000-000000000001') <> 1 then
    raise exception 'first immutable adaptive attempt missing';
  end if;
  if (select count(*) from public.attempt_answers aa join public.attempts a on a.id=aa.attempt_id
      where a.learner_id=learner and a.activity_id='71000000-0000-0000-0000-000000000001'
        and aa.skill_id is not null and aa.mastery_after=100) <> 6 then
    raise exception 'per-answer skill evidence missing';
  end if;
  if (select count(*) from public.skill_mastery where learner_id=learner) <> 6 then
    raise exception 'skill mastery rows missing';
  end if;
  if not exists(select 1 from public.badge_awards where learner_id=learner) then
    raise exception 'first badge was not awarded';
  end if;
  if public.coin_balance(learner) <= 0 then
    raise exception 'server did not award coins';
  end if;
end $$;

-- Repeat the identical easy activity. Evidence must be stored, but capped
-- activity/mastery awards and one-time badges must not be farmed.
set role authenticated;
insert into adaptive_test_results(label,payload)
select 'repeat',public.submit_activity(
  '71000000-0000-0000-0000-000000000001',
  '{
    "81000000-0000-0000-0000-000000000001":"7",
    "81000000-0000-0000-0000-000000000002":"int",
    "81000000-0000-0000-0000-000000000003":"int",
    "81000000-0000-0000-0000-000000000004":"10",
    "81000000-0000-0000-0000-000000000005":".2f",
    "81000000-0000-0000-0000-000000000006":"age is a string"
  }'::jsonb,
  0
);
reset role;

do $$
declare
  learner constant uuid := '90000000-0000-0000-0000-000000000002';
  result jsonb := (select payload from adaptive_test_results where label='repeat');
begin
  if (result->>'coinsAwarded')::integer <> 0 then
    raise exception 'repeat activity incorrectly awarded farmable coins';
  end if;
  if (select count(*) from public.attempts where learner_id=learner
      and activity_id='71000000-0000-0000-0000-000000000001') <> 2 then
    raise exception 'repeat immutable attempt missing';
  end if;
  if (select count(*) from public.coin_transactions where learner_id=learner
      and idempotency_key like 'activity-complete:%') <> 1 then
    raise exception 'activity completion reward was duplicated';
  end if;
  if (select count(*) from public.badge_awards ba join public.badge_definitions bd on bd.id=ba.badge_id
      where ba.learner_id=learner and bd.code='first-step') <> 1 then
    raise exception 'one-time badge was duplicated';
  end if;
  if public.pathway_for(100,6) <> 'Stretch' then
    raise exception 'a fully hinted result was incorrectly treated as mastery';
  end if;
end $$;

-- A successful no-hint mastery check schedules a different five-question
-- retrieval activity for a later date.
set role authenticated;
-- Complete the required Core stage first: Mastery must not be directly
-- reachable from Guided Practice.
select public.submit_activity(
  '71000000-0000-0000-0000-000000000002',
  '{}'::jsonb,
  0
);
insert into adaptive_test_results(label,payload)
select 'mastery',public.submit_activity(
  '71000000-0000-0000-0000-000000000004',
  '{
    "81000000-0000-0000-0000-000000000025":"7",
    "81000000-0000-0000-0000-000000000026":"str, int, float",
    "81000000-0000-0000-0000-000000000027":"distance = float(input(\"Distance: \"))",
    "81000000-0000-0000-0000-000000000028":"7.0",
    "81000000-0000-0000-0000-000000000029":"logic error"
  }'::jsonb,
  0
);
reset role;

do $$
declare learner constant uuid := '90000000-0000-0000-0000-000000000002';
begin
  if (select (payload->>'percentage')::numeric from adaptive_test_results where label='mastery') <> 100 then
    raise exception 'mastery check did not score 100';
  end if;
  if not exists(
    select 1 from public.retrieval_schedules
    where learner_id=learner
      and source_activity_id='71000000-0000-0000-0000-000000000004'
      and review_activity_id='71000000-0000-0000-0000-000000000005'
      and scheduled_for=current_date+7 and status='scheduled'
  ) then raise exception 'later retrieval review was not scheduled'; end if;
  if exists(
    select 1 from public.activity_questions mastery
    join public.activity_questions retrieval on retrieval.question_id=mastery.question_id
    where mastery.activity_id='71000000-0000-0000-0000-000000000004'
      and retrieval.activity_id='71000000-0000-0000-0000-000000000005'
  ) then raise exception 'retrieval review repeated mastery questions'; end if;
end $$;

-- A cosmetic purchase is transactional and creates a negative ledger entry.
set role authenticated;
insert into adaptive_test_ids(label,id)
select 'purchase',public.purchase_reward('67000000-0000-0000-0000-000000000001');
reset role;

do $$
declare
  learner constant uuid := '90000000-0000-0000-0000-000000000002';
begin
  if not exists(
    select 1 from public.reward_purchases
    where id=(select id from adaptive_test_ids where label='purchase')
      and learner_id=learner and price_paid=40
  ) then raise exception 'cosmetic reward purchase missing'; end if;
  if not exists(
    select 1 from public.coin_transactions
    where learner_id=learner and reason='reward_purchase' and amount=-40
  ) then raise exception 'purchase ledger debit missing'; end if;
end $$;

-- Another learner cannot read any of this learner's adaptive or gamification
-- evidence and cannot invoke staff controls.
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000003';
set role authenticated;
do $$
begin
  if exists(select 1 from public.skill_mastery where learner_id='90000000-0000-0000-0000-000000000002') then
    raise exception 'cross-learner skill mastery leak';
  end if;
  if exists(select 1 from public.coin_transactions where learner_id='90000000-0000-0000-0000-000000000002') then
    raise exception 'cross-learner coin ledger leak';
  end if;
  if exists(select 1 from public.badge_awards where learner_id='90000000-0000-0000-0000-000000000002') then
    raise exception 'cross-learner badge leak';
  end if;
  if exists(select 1 from public.retrieval_schedules where learner_id='90000000-0000-0000-0000-000000000002') then
    raise exception 'cross-learner retrieval leak';
  end if;
  begin
    perform public.teacher_adjust_coins(
      '90000000-0000-0000-0000-000000000002',5,'Unauthorised test adjustment.'
    );
    raise exception 'learner invoked a teacher coin correction';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select 'adaptive pilot journey passed' as result;
