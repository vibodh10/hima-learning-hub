create or replace function public.apply_configured_coin_rules(attempt_uuid uuid)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  actor public.user_profiles;
  attempt_row public.attempts;
  activity_row public.activities;
  rules jsonb:='{}'::jsonb;
  coins_enabled boolean:=true;
  base_amount integer;
  desired_amount integer;
  delta integer;
  net_adjustment integer:=0;
  mastery_events integer;
  effective_deadline timestamptz;
begin
  select * into actor from public.user_profiles
  where id=auth.uid() and role='student' and archived_at is null;
  select * into attempt_row from public.attempts
  where id=attempt_uuid and learner_id=actor.id and completed_at is not null;
  select * into activity_row from public.activities where id=attempt_row.activity_id;
  if actor.id is null or attempt_row.id is null or activity_row.id is null then
    raise exception 'attempt_not_available' using errcode='42501';
  end if;

  select coalesce(
    (select gs.coin_rules from public.gamification_settings gs
      where gs.learner_id=actor.id),
    (select gs.coin_rules from public.gamification_settings gs
      join public.enrolments e on e.class_id=gs.class_id
      where e.student_id=actor.id and e.archived_at is null
      order by gs.updated_at desc limit 1),
    (select gs.coin_rules from public.gamification_settings gs
      where gs.organisation_id=actor.organisation_id
        and gs.class_id is null and gs.learner_id is null),
    '{}'::jsonb
  ),coalesce(
    (select gs.coins_enabled from public.gamification_settings gs
      where gs.learner_id=actor.id),
    (select gs.coins_enabled from public.gamification_settings gs
      join public.enrolments e on e.class_id=gs.class_id
      where e.student_id=actor.id and e.archived_at is null
      order by gs.updated_at desc limit 1),
    true
  ) into rules,coins_enabled;
  if not coins_enabled then return 0; end if;

  select coalesce(sum(amount),0)::integer into base_amount
  from public.coin_transactions where learner_id=actor.id
    and source_attempt_id=attempt_uuid and reason='required_learning'
    and idempotency_key not like 'coin-rule-adjust:%';
  if base_amount<>0 then
    desired_amount:=coalesce((rules->>'required_learning')::integer,10);
    delta:=desired_amount-base_amount;
    if delta<>0 then
      insert into public.coin_transactions(
        learner_id,amount,reason,description,source_attempt_id,source_activity_id,
        idempotency_key,created_by,metadata
      ) values(actor.id,delta,'required_learning','Applied configured required-learning coin rule.',
        attempt_uuid,activity_row.id,format('coin-rule-adjust:required:%s',attempt_uuid),
        actor.id,jsonb_build_object('configured_amount',desired_amount,'base_amount',base_amount))
      on conflict(learner_id,idempotency_key) do nothing;
      if found then net_adjustment:=net_adjustment+delta; end if;
    end if;
  end if;

  select count(*)::integer,coalesce(sum(amount),0)::integer
  into mastery_events,base_amount
  from public.coin_transactions where learner_id=actor.id
    and source_attempt_id=attempt_uuid and reason='skill_mastery'
    and idempotency_key not like 'coin-rule-adjust:%';
  if mastery_events>0 then
    desired_amount:=mastery_events*coalesce((rules->>'skill_mastery')::integer,15);
    delta:=desired_amount-base_amount;
    if delta<>0 then
      insert into public.coin_transactions(
        learner_id,amount,reason,description,source_attempt_id,source_activity_id,
        idempotency_key,created_by,metadata
      ) values(actor.id,delta,'skill_mastery','Applied configured skill-mastery coin rule.',
        attempt_uuid,activity_row.id,format('coin-rule-adjust:mastery:%s',attempt_uuid),
        actor.id,jsonb_build_object('configured_each',coalesce((rules->>'skill_mastery')::integer,15),
          'events',mastery_events,'base_amount',base_amount))
      on conflict(learner_id,idempotency_key) do nothing;
      if found then net_adjustment:=net_adjustment+delta; end if;
    end if;
  end if;

  select coalesce(sum(amount),0)::integer into base_amount
  from public.coin_transactions where learner_id=actor.id
    and source_attempt_id=attempt_uuid and reason='improvement'
    and idempotency_key not like 'coin-rule-adjust:%';
  if base_amount<>0 then
    desired_amount:=coalesce((rules->>'improvement')::integer,5);
    delta:=desired_amount-base_amount;
    if delta<>0 then
      insert into public.coin_transactions(
        learner_id,amount,reason,description,source_attempt_id,source_activity_id,
        idempotency_key,created_by,metadata
      ) values(actor.id,delta,'improvement','Applied configured improvement coin rule.',
        attempt_uuid,activity_row.id,format('coin-rule-adjust:improvement:%s',attempt_uuid),
        actor.id,jsonb_build_object('configured_amount',desired_amount,'base_amount',base_amount))
      on conflict(learner_id,idempotency_key) do nothing;
      if found then net_adjustment:=net_adjustment+delta; end if;
    end if;
  end if;

  select coalesce(sum(amount),0)::integer into base_amount
  from public.coin_transactions where learner_id=actor.id
    and source_attempt_id=attempt_uuid and reason='retrieval'
    and idempotency_key not like 'coin-rule-adjust:%';
  if base_amount<>0 then
    desired_amount:=coalesce((rules->>'retrieval')::integer,8);
    delta:=desired_amount-base_amount;
    if delta<>0 then
      insert into public.coin_transactions(
        learner_id,amount,reason,description,source_attempt_id,source_activity_id,
        idempotency_key,created_by,metadata
      ) values(actor.id,delta,'retrieval','Applied configured retrieval coin rule.',
        attempt_uuid,activity_row.id,format('coin-rule-adjust:retrieval:%s',attempt_uuid),
        actor.id,jsonb_build_object('configured_amount',desired_amount,'base_amount',base_amount))
      on conflict(learner_id,idempotency_key) do nothing;
      if found then net_adjustment:=net_adjustment+delta; end if;
    end if;
  end if;

  select coalesce(
    (select al.deadline_at from public.activity_allocations al
      where al.activity_id=activity_row.id and al.archived_at is null
        and (al.learner_id=actor.id or exists(select 1 from public.enrolments e
          where e.student_id=actor.id and e.class_id=al.class_id and e.archived_at is null))
      order by (al.learner_id=actor.id) desc,al.created_at desc limit 1),
    activity_row.deadline_at
  ) into effective_deadline;
  desired_amount:=coalesce((rules->>'on_time')::integer,3);
  if desired_amount>0 and activity_row.kind='homework'
    and effective_deadline is not null and attempt_row.completed_at<=effective_deadline then
    insert into public.coin_transactions(
      learner_id,amount,reason,description,source_attempt_id,source_activity_id,
      idempotency_key,created_by,metadata
    ) values(actor.id,desired_amount,'on_time','Completed homework on time.',
      attempt_uuid,activity_row.id,format('on-time:%s',activity_row.id),actor.id,
      jsonb_build_object('deadline',effective_deadline))
    on conflict(learner_id,idempotency_key) do nothing;
    if found then net_adjustment:=net_adjustment+desired_amount; end if;
  end if;

  desired_amount:=coalesce((rules->>'optional_challenge')::integer,5);
  if desired_amount>0 and (not activity_row.required
      or activity_row.learning_stage='challenge_practice') then
    insert into public.coin_transactions(
      learner_id,amount,reason,description,source_attempt_id,source_activity_id,
      idempotency_key,created_by
    ) values(actor.id,desired_amount,'optional_challenge','Completed optional challenge practice.',
      attempt_uuid,activity_row.id,format('optional-challenge:%s',activity_row.id),actor.id)
    on conflict(learner_id,idempotency_key) do nothing;
    if found then net_adjustment:=net_adjustment+desired_amount; end if;
  end if;
  return net_adjustment;
end $$;

revoke all on function public.apply_configured_coin_rules(uuid) from public;
grant execute on function public.apply_configured_coin_rules(uuid) to authenticated;
