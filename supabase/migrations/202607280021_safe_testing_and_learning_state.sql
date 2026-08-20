-- Safe staff testing, authoritative learning sequence, award notifications,
-- cosmetic equipment and complete coin-ledger state.

alter table public.assessment_skill_results
  add column if not exists question_count integer not null default 1,
  add column if not exists evidence_sufficient boolean not null default false;

create or replace function public.set_assessment_result_evidence_strength()
returns trigger language plpgsql security definer set search_path=public
as $$
declare supported integer;
begin
  select count(*) into supported from public.attempt_answers aa
  join public.assessment_instances i on i.attempt_id=aa.attempt_id
  where i.id=new.assessment_instance_id and aa.skill_id=new.skill_id;
  new.question_count:=supported;
  new.evidence_sufficient:=supported>=2;
  return new;
end;
$$;
drop trigger if exists assessment_result_evidence_strength on public.assessment_skill_results;
create trigger assessment_result_evidence_strength before insert or update
on public.assessment_skill_results for each row
execute function public.set_assessment_result_evidence_strength();

create or replace function public.normalise_comparison_evidence()
returns trigger language plpgsql security definer set search_path=public
as $$
declare start_count integer:=0;progress_count integer:=0;retention_count integer:=0;
begin
  select question_count into start_count from public.assessment_skill_results
    where id=new.starting_result_id;
  if new.latest_progress_result_id is not null then
    select question_count into progress_count from public.assessment_skill_results
      where id=new.latest_progress_result_id;
  end if;
  if new.retention_result_id is not null then
    select question_count into retention_count from public.assessment_skill_results
      where id=new.retention_result_id;
  end if;
  new.evidence:=coalesce(new.evidence,'{}')||jsonb_build_object(
    'starting_question_count',coalesce(start_count,0),
    'progress_question_count',coalesce(progress_count,0),
    'retention_question_count',coalesce(retention_count,0),
    'starting_sufficient',coalesce(start_count,0)>=2,
    'progress_sufficient',coalesce(progress_count,0)>=2
  );
  if coalesce(start_count,0)<2
    or (new.latest_progress_result_id is not null and coalesce(progress_count,0)<2) then
    new.status:='Insufficient Evidence';
    new.improvement_points:=null;
  end if;
  return new;
end;
$$;
drop trigger if exists comparison_evidence_normalisation on public.skill_progress_comparisons;
create trigger comparison_evidence_normalisation before insert or update
on public.skill_progress_comparisons for each row
execute function public.normalise_comparison_evidence();

alter table public.badge_awards
  add column if not exists notification_seen_at timestamptz;

alter table public.coin_transactions
  add column if not exists balance_before integer,
  add column if not exists balance_after integer,
  add column if not exists transaction_status text not null default 'posted',
  add constraint coin_transaction_status_check
    check(transaction_status in ('posted','refunded','reversed'));

alter table public.reward_purchases
  add column if not exists equipped_at timestamptz,
  add column if not exists purchase_status text not null default 'completed',
  add constraint reward_purchase_status_check
    check(purchase_status in ('completed','refunded','cancelled'));

alter table public.targets
  add column if not exists linked_activity_id uuid references public.activities(id);

create or replace function public.scope_automatic_target()
returns trigger language plpgsql security definer set search_path=public
as $$
declare
  source_attempt public.attempts;
  source_activity public.activities;
  source_topic uuid;
  source_unit uuid;
  source_course uuid;
  source_class uuid;
begin
  if new.approved_by is not null or not (new.evidence ? 'attempt_id') then
    return new;
  end if;
  select * into source_attempt from public.attempts
    where id=(new.evidence->>'attempt_id')::uuid;
  select * into source_activity from public.activities where id=source_attempt.activity_id;
  if source_activity.assessment_kind='course_starting_point' then
    return null;
  end if;
  select t.id,t.unit_id,u.course_id into source_topic,source_unit,source_course
  from public.lessons l join public.topics t on t.id=l.topic_id
  join public.units u on u.id=t.unit_id where l.id=source_activity.lesson_id;
  select e.class_id into source_class from public.enrolments e
  join public.classes c on c.id=e.class_id
  where e.student_id=new.learner_id and e.archived_at is null
    and c.course_id=source_course and c.archived_at is null
  order by e.enrolled_at desc limit 1;
  new.topic_id:=source_topic;
  new.unit_id:=source_unit;
  new.course_id:=source_course;
  new.class_id:=source_class;
  if new.skill_id is null and new.evidence ? 'skill_id' then
    new.skill_id:=(new.evidence->>'skill_id')::uuid;
  end if;
  select a.id into new.linked_activity_id from public.activities a
  join public.lessons l on l.id=a.lesson_id
  where l.topic_id=source_topic and a.status='approved' and a.archived_at is null
    and a.learning_stage in ('guided_practice','core_practice','challenge_practice')
  order by case a.learning_stage when 'core_practice' then 1
    when 'guided_practice' then 2 else 3 end limit 1;
  new.success_measure:=coalesce(new.success_measure,
    'Complete the linked practice and meet the stated review percentage.');
  return new;
end;
$$;

drop trigger if exists scope_automatic_target_before_insert on public.targets;
create trigger scope_automatic_target_before_insert before insert on public.targets
for each row execute function public.scope_automatic_target();

-- PostgreSQL does not permit a subquery expression in an index on every
-- supported hosted version, so enforce one equipped item per kind in the RPC.

create table if not exists public.activity_unlock_overrides (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.user_profiles(id),
  activity_id uuid not null references public.activities(id),
  reason text not null,
  expires_at timestamptz,
  teacher_id uuid not null references public.user_profiles(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create unique index if not exists active_activity_unlock_override_idx
  on public.activity_unlock_overrides(learner_id,activity_id)
  where revoked_at is null;

create table if not exists public.test_mode_sessions (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.user_profiles(id),
  organisation_id uuid not null references public.organisations(id),
  label text not null default 'Demo learner',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  reset_at timestamptz
);
create unique index if not exists one_active_test_session_per_staff_idx
  on public.test_mode_sessions(staff_id) where active;

create table if not exists public.test_mode_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.test_mode_sessions(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  check(event_type in (
    'activity_opened','answer_revealed','simulated_correct','simulated_incorrect',
    'simulated_percentage','simulated_pathway','target_achieved','badge_awarded',
    'coins_awarded','reward_purchased','reward_equipped','confetti_previewed'
  ))
);

alter table public.activity_unlock_overrides enable row level security;
alter table public.test_mode_sessions enable row level security;
alter table public.test_mode_events enable row level security;

create policy activity_unlock_overrides_staff_read on public.activity_unlock_overrides
for select using (
  public.can_access_learner(learner_id)
  and (select role from public.current_profile()) in ('teacher','administrator')
);
create policy own_test_sessions on public.test_mode_sessions for select using (
  staff_id=auth.uid() and (select role from public.current_profile()) in ('teacher','administrator')
);
create policy own_test_events on public.test_mode_events for select using (
  exists(select 1 from public.test_mode_sessions s
    where s.id=session_id and s.staff_id=auth.uid())
);

grant select on public.activity_unlock_overrides,public.test_mode_sessions,
  public.test_mode_events to authenticated;

create or replace function public.activity_stage_rank(activity_row public.activities)
returns integer language sql immutable
as $$
  select case
    when activity_row.assessment_kind='unit_starting_point' then 1
    when activity_row.learning_stage='guided_practice' then 4
    when activity_row.learning_stage='core_practice' then 5
    when activity_row.learning_stage='challenge_practice' then 6
    when activity_row.learning_stage='mastery_check'
      and activity_row.assessment_kind is null then 7
    when activity_row.assessment_kind='progress_point' then 8
    when activity_row.assessment_kind='retention_check'
      or activity_row.learning_stage='retrieval_review' then 9
    else 3 end
$$;

create or replace function public.learner_activity_states(
  lesson_uuid uuid,learner_uuid uuid default auth.uid()
) returns table(
  activity_id uuid,sequence_order integer,state text,status_detail text,
  completed_at timestamptz,percentage numeric,available_on date
)
language plpgsql stable security definer set search_path=public
as $$
declare
  actor public.user_profiles;
  activity_row public.activities;
  latest_attempt public.attempts;
  prior_required boolean;
  scheduled_date date;
  overridden boolean;
begin
  actor:=public.current_profile();
  if actor.id is null or not public.can_access_learner(learner_uuid) then
    raise exception 'not_authorised' using errcode='42501';
  end if;
  for activity_row in
    select a.* from public.activities a
    where a.lesson_id=lesson_uuid and a.status='approved' and a.archived_at is null
    order by public.activity_stage_rank(a),a.title
  loop
    select x.* into latest_attempt from public.attempts x
    where x.learner_id=learner_uuid and x.activity_id=activity_row.id
      and x.completed_at is not null
    order by x.completed_at desc limit 1;
    select exists(
      select 1 from public.activity_unlock_overrides o
      where o.learner_id=learner_uuid and o.activity_id=activity_row.id
        and o.revoked_at is null and (o.expires_at is null or o.expires_at>now())
    ) into overridden;
    scheduled_date:=null;
    if activity_row.assessment_kind='retention_check'
      or activity_row.learning_stage='retrieval_review' then
      select min(rs.scheduled_for) into scheduled_date
      from public.retrieval_schedules rs
      where rs.learner_id=learner_uuid
        and rs.review_activity_id=activity_row.id
        and rs.status in ('scheduled','available');
    end if;

    if latest_attempt.id is not null then
      activity_id:=activity_row.id;
      sequence_order:=public.activity_stage_rank(activity_row);
      completed_at:=latest_attempt.completed_at;
      percentage:=latest_attempt.percentage;
      available_on:=scheduled_date;
      if activity_row.learning_stage='mastery_check'
        and activity_row.assessment_kind is null then
        state:=case when latest_attempt.percentage>=70
          then 'Mastery Demonstrated' else 'Additional Practice Required' end;
      else state:='Completed'; end if;
      status_detail:=format('%s%%',round(latest_attempt.percentage));
      return next;
      continue;
    end if;

    prior_required:=case
      when activity_row.learning_stage='core_practice' then exists(
        select 1 from public.activities a join public.attempts x on x.activity_id=a.id
        where a.lesson_id=lesson_uuid and a.learning_stage='guided_practice'
          and x.learner_id=learner_uuid and x.completed_at is not null)
        or not exists(
          select 1 from public.activities a where a.lesson_id=lesson_uuid
            and a.learning_stage='guided_practice' and a.status='approved'
            and a.archived_at is null)
      when activity_row.learning_stage='challenge_practice' then exists(
        select 1 from public.activities a join public.attempts x on x.activity_id=a.id
        where a.lesson_id=lesson_uuid and a.learning_stage='core_practice'
          and x.learner_id=learner_uuid and x.completed_at is not null)
        or not exists(
          select 1 from public.activities a where a.lesson_id=lesson_uuid
            and a.learning_stage='core_practice' and a.status='approved'
            and a.archived_at is null)
      when activity_row.learning_stage='mastery_check'
        and activity_row.assessment_kind is null then exists(
        select 1 from public.activities a join public.attempts x on x.activity_id=a.id
        where a.lesson_id=lesson_uuid and a.learning_stage='core_practice'
          and x.learner_id=learner_uuid and x.completed_at is not null)
        or not exists(
          select 1 from public.activities a where a.lesson_id=lesson_uuid
            and a.learning_stage='core_practice' and a.status='approved'
            and a.archived_at is null)
      when activity_row.assessment_kind='progress_point' then exists(
        select 1 from public.activities a join public.attempts x on x.activity_id=a.id
        where a.lesson_id=lesson_uuid and a.learning_stage='mastery_check'
          and a.assessment_kind is null and x.learner_id=learner_uuid
          and x.completed_at is not null)
        or exists(
          select 1 from public.learner_routes lr
          join public.lessons l on l.topic_id=lr.topic_id
          where lr.learner_id=learner_uuid
            and l.id=lesson_uuid
            and lr.status='active'
            and lr.route in ('Fast-Tracked','Mastery Check Only'))
        or not exists(
          select 1 from public.activities a
          where a.lesson_id=lesson_uuid
            and a.learning_stage in ('guided_practice','core_practice','mastery_check')
            and a.assessment_kind is null
            and a.status='approved' and a.archived_at is null)
      else true end;

    activity_id:=activity_row.id;
    sequence_order:=public.activity_stage_rank(activity_row);
    completed_at:=null; percentage:=null; available_on:=scheduled_date;
    if overridden then state:='Available';status_detail:='Teacher override';
    elsif (activity_row.assessment_kind='retention_check'
      or activity_row.learning_stage='retrieval_review') then
      if scheduled_date is null or scheduled_date>current_date then
        state:='Scheduled';
        status_detail:=case when scheduled_date is null then 'Awaiting schedule'
          else format('Scheduled for %s',to_char(scheduled_date,'DD/MM/YYYY')) end;
      else state:='Available';status_detail:='Available now';end if;
    elsif prior_required then state:='Available';status_detail:='Available now';
    else state:='Locked';status_detail:='Complete the earlier required stage first';
    end if;
    return next;
  end loop;
end;
$$;

-- Preserve the mature marking function and place the new sequencing check in a
-- narrow wrapper.
alter function public.submit_activity(uuid,jsonb,integer)
  rename to submit_activity_mark_and_record;

create function public.submit_activity(
  activity_uuid uuid,submitted_answers jsonb,hint_count integer default 0
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  actor public.user_profiles;
  lesson_uuid uuid;
  activity_state text;
begin
  actor:=public.current_profile();
  if actor.role<>'student' then
    raise exception 'student_submission_only' using errcode='42501';
  end if;
  select lesson_id into lesson_uuid from public.activities where id=activity_uuid;
  select state into activity_state
  from public.learner_activity_states(lesson_uuid,actor.id) st
  where st.activity_id=activity_uuid;
  if activity_state is null or activity_state not in (
    'Available','Completed','Mastery Demonstrated','Additional Practice Required'
  ) then raise exception 'activity_locked' using errcode='42501'; end if;
  return public.submit_activity_mark_and_record(activity_uuid,submitted_answers,hint_count);
end;
$$;

create or replace function public.teacher_override_activity_lock(
  learner_uuid uuid,activity_uuid uuid,reason_value text,expires_value timestamptz
) returns uuid
language plpgsql security definer set search_path=public
as $$
declare actor public.user_profiles; created_uuid uuid;
begin
  actor:=public.current_profile();
  if actor.role not in ('teacher','administrator')
    or not public.can_access_learner(learner_uuid)
    or length(trim(reason_value))<5 then
    raise exception 'not_authorised' using errcode='42501';
  end if;
  insert into public.activity_unlock_overrides(
    learner_id,activity_id,reason,expires_at,teacher_id
  ) values(learner_uuid,activity_uuid,trim(reason_value),expires_value,actor.id)
  on conflict(learner_id,activity_id) where revoked_at is null do update set
    reason=excluded.reason,expires_at=excluded.expires_at,teacher_id=excluded.teacher_id
  returning id into created_uuid;
  insert into public.audit_logs(
    organisation_id,actor_id,action,entity_type,entity_id,after_data
  ) values(actor.organisation_id,actor.id,'activity.lock_overridden',
    'activity_unlock_override',created_uuid,
    jsonb_build_object('learner_id',learner_uuid,'activity_id',activity_uuid,
      'reason',trim(reason_value),'expires_at',expires_value));
  return created_uuid;
end;
$$;

create or replace function public.start_test_mode()
returns uuid language plpgsql security definer set search_path=public
as $$
declare actor public.user_profiles; session_uuid uuid;
begin
  actor:=public.current_profile();
  if actor.role not in ('teacher','administrator') then
    raise exception 'not_authorised' using errcode='42501';
  end if;
  select id into session_uuid from public.test_mode_sessions
    where staff_id=actor.id and active;
  if session_uuid is null then
    insert into public.test_mode_sessions(staff_id,organisation_id)
    values(actor.id,actor.organisation_id) returning id into session_uuid;
  end if;
  return session_uuid;
end;
$$;

create or replace function public.record_test_mode_event(
  event_value text,payload_value jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path=public
as $$
declare session_uuid uuid; event_uuid uuid;
begin
  session_uuid:=public.start_test_mode();
  insert into public.test_mode_events(session_id,event_type,payload)
  values(session_uuid,event_value,coalesce(payload_value,'{}'))
  returning id into event_uuid;
  return event_uuid;
end;
$$;

create or replace function public.reset_test_mode()
returns integer language plpgsql security definer set search_path=public
as $$
declare actor public.user_profiles; removed integer;
begin
  actor:=public.current_profile();
  if actor.role not in ('teacher','administrator') then
    raise exception 'not_authorised' using errcode='42501';
  end if;
  delete from public.test_mode_events e using public.test_mode_sessions s
    where e.session_id=s.id and s.staff_id=actor.id;
  get diagnostics removed=row_count;
  update public.test_mode_sessions set reset_at=now()
    where staff_id=actor.id and active;
  insert into public.audit_logs(
    organisation_id,actor_id,action,entity_type,after_data
  ) values(actor.organisation_id,actor.id,'test_mode.reset','test_mode_session',
    jsonb_build_object('events_removed',removed));
  return removed;
end;
$$;

create or replace function public.test_mode_expected_answers(activity_uuid uuid)
returns jsonb language plpgsql stable security definer set search_path=public
as $$
declare actor public.user_profiles;
begin
  actor:=public.current_profile();
  if actor.role not in ('teacher','administrator') then
    raise exception 'not_authorised' using errcode='42501';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'questionId',q.id,'question',q.question_text,'answer',q.correct_answer,
      'acceptableAnswers',q.acceptable_answers,'explanation',q.explanation
    ) order by aq.sort_order),'[]')
    from public.activity_questions aq join public.questions q on q.id=aq.question_id
    where aq.activity_id=activity_uuid
  );
end;
$$;

create or replace function public.mark_badge_notifications_seen(award_uuids uuid[])
returns integer language plpgsql security definer set search_path=public
as $$
declare changed integer;
begin
  update public.badge_awards set notification_seen_at=coalesce(notification_seen_at,now())
  where learner_id=auth.uid() and id=any(award_uuids);
  get diagnostics changed=row_count;
  return changed;
end;
$$;

create or replace function public.equip_reward(purchase_uuid uuid,equip_value boolean)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare actor public.user_profiles; purchase_row public.reward_purchases;
  reward_row public.reward_items;
begin
  actor:=public.current_profile();
  if actor.role<>'student' then raise exception 'not_authorised' using errcode='42501';end if;
  select * into purchase_row from public.reward_purchases
    where id=purchase_uuid and learner_id=actor.id and purchase_status='completed';
  select * into reward_row from public.reward_items where id=purchase_row.reward_id;
  if reward_row.id is null then raise exception 'reward_not_owned' using errcode='42501';end if;
  if equip_value then
    update public.reward_purchases p set equipped_at=null
    where p.learner_id=actor.id and p.id<>purchase_uuid and p.equipped_at is not null
      and exists(select 1 from public.reward_items ri
        where ri.id=p.reward_id and ri.kind=reward_row.kind);
    update public.reward_purchases set equipped_at=now() where id=purchase_uuid;
  else update public.reward_purchases set equipped_at=null where id=purchase_uuid;
  end if;
  return jsonb_build_object('purchaseId',purchase_uuid,'rewardId',reward_row.id,
    'title',reward_row.title,'kind',reward_row.kind,'equipped',equip_value,
    'assetConfig',reward_row.asset_config);
end;
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
  select coalesce(sum(amount),0)::integer into balance from public.coin_transactions
    where learner_id=actor.id and transaction_status='posted';
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
    select coalesce(sum(amount),0)::integer into balance from public.coin_transactions
      where learner_id=row_data.learner_id and transaction_status='posted';
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

-- Recalculate existing ledger running balances deterministically.
update public.assessment_skill_results
set question_count=question_count;
update public.skill_progress_comparisons
set evidence=evidence;

with running as (
  select id,
    coalesce(sum(amount) over(partition by learner_id order by created_at,id
      rows between unbounded preceding and 1 preceding),0)::integer before_value,
    sum(amount) over(partition by learner_id order by created_at,id)::integer after_value
  from public.coin_transactions
)
update public.coin_transactions ct set
  balance_before=running.before_value,balance_after=running.after_value
from running where running.id=ct.id
  and (ct.balance_before is null or ct.balance_after is null);

revoke all on function public.submit_activity(uuid,jsonb,integer) from public;
revoke all on function public.submit_activity_mark_and_record(uuid,jsonb,integer) from public;
revoke all on function public.learner_activity_states(uuid,uuid) from public;
revoke all on function public.teacher_override_activity_lock(uuid,uuid,text,timestamptz) from public;
revoke all on function public.start_test_mode() from public;
revoke all on function public.record_test_mode_event(text,jsonb) from public;
revoke all on function public.reset_test_mode() from public;
revoke all on function public.test_mode_expected_answers(uuid) from public;
revoke all on function public.mark_badge_notifications_seen(uuid[]) from public;
revoke all on function public.equip_reward(uuid,boolean) from public;
revoke all on function public.purchase_reward_v2(uuid) from public;
revoke all on function public.reconcile_incomplete_reward_purchases(uuid) from public;
grant execute on function public.submit_activity(uuid,jsonb,integer) to authenticated;
grant execute on function public.learner_activity_states(uuid,uuid) to authenticated;
revoke all on function public.submit_activity_mark_and_record(uuid,jsonb,integer) from public,anon,authenticated;
grant execute on function public.teacher_override_activity_lock(uuid,uuid,text,timestamptz) to authenticated;
grant execute on function public.start_test_mode() to authenticated;
grant execute on function public.record_test_mode_event(text,jsonb) to authenticated;
grant execute on function public.reset_test_mode() to authenticated;
grant execute on function public.test_mode_expected_answers(uuid) to authenticated;
grant execute on function public.mark_badge_notifications_seen(uuid[]) to authenticated;
grant execute on function public.equip_reward(uuid,boolean) to authenticated;
grant execute on function public.purchase_reward_v2(uuid) to authenticated;
grant execute on function public.reconcile_incomplete_reward_purchases(uuid) to authenticated;
