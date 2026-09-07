-- Weekly goals can cover a unit/diagnostic without inventing a topic association.
alter table public.targets alter column topic_id drop not null;
alter table public.targets add column automation_key text;
create unique index targets_automation_key on public.targets(automation_key) where automation_key is not null;

create table public.learner_automation_summaries (
  learner_id uuid not null references public.user_profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  target_id uuid references public.targets(id) on delete set null,
  feedback text not null,
  appreciation text,
  evidence jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key(learner_id,class_id)
);
alter table public.learner_automation_summaries enable row level security;
grant select on public.learner_automation_summaries to authenticated;
create policy automation_summary_read on public.learner_automation_summaries for select to authenticated
using (public.can_access_class(class_id) and (learner_id=auth.uid() or public.can_manage_class(class_id)));

create function public.refresh_learner_automation(learner_uuid uuid,class_uuid uuid)
returns void language plpgsql security definer set search_path='' as $$
declare
  actor public.user_profiles;
  journey record; chosen record; prior_goal record;
  unit_row public.units;
  latest public.learner_curriculum_attempts;
  previous_score numeric; baseline_done boolean; complete boolean;
  goal_id uuid; topic_code_value text; goal_text text; feedback_text text; praise_text text;
  feedback_evidence jsonb; today date:=(now() at time zone 'Europe/London')::date;
begin
  actor:=public.current_profile();
  if actor.id is null or not exists (
    select 1 from public.enrolments e join public.classes c on c.id=e.class_id
    join public.user_profiles p on p.id=e.student_id
    where e.class_id=class_uuid and e.student_id=learner_uuid and e.archived_at is null
      and c.archived_at is null and p.archived_at is null and p.role='student'
      and c.organisation_id=actor.organisation_id
  ) or not (actor.id=learner_uuid or (actor.role in ('teacher','administrator') and public.can_manage_class(class_uuid))) then
    raise exception 'learner_automation_not_available' using errcode='42501';
  end if;
  -- Serialize refreshes for the same learner/group; retries do not duplicate goals.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(learner_uuid::text||class_uuid::text,0));
  select * into journey from public.current_class_learning_journey(class_uuid,today);
  if journey.journey_id is null or journey.position_status='not_started' then return; end if;
  select u.* into unit_row from public.units u join public.class_units cu on cu.unit_id=u.id
    where u.id=journey.unit_id and cu.class_id=class_uuid and cu.active and cu.archived_at is null and u.archived_at is null;
  if unit_row.id is null then return; end if;
  baseline_done:=exists(select 1 from public.unit_starting_point_baselines b where b.learner_id=learner_uuid and b.unit_id=unit_row.id)
    or (exists(select 1 from public.learning_journey_weeks w where w.template_id=journey.template_id and w.configuration->>'topic_code' is not null)
      and not exists(select 1 from public.learning_journey_weeks w where w.template_id=journey.template_id
        and w.configuration->>'topic_code' is not null and (select count(distinct coalesce(e->>'id',e::text))
          from public.learner_curriculum_progress p,lateral pg_catalog.jsonb_array_elements(p.evidence) e
          where p.learner_id=learner_uuid and p.unit_code=unit_row.code and p.topic_code=w.configuration->>'topic_code'
            and e->>'kind'='initial_diagnostic' and e->>'unitCode'=unit_row.code and e->>'topicCode'=p.topic_code
            and e->>'independent'='true' and coalesce(e->>'hintsUsed','0')='0')<3));
  update public.targets set status='replaced',next_action='Replaced by the current group learning journey.'
    where learner_id=learner_uuid and class_id=class_uuid and automation_key is not null
      and evidence->>'journey_id'<>journey.journey_id::text and status='active';
  update public.targets set status='active',review_on=coalesce(review_on,target_date),
    evidence=evidence||jsonb_build_object('automatically_activated',true)
    where learner_id=learner_uuid and class_id=class_uuid and unit_id=unit_row.id and status='proposed'
      and approved_by is null and archived_at is null and evidence ? 'attempt_id';

  for prior_goal in select * from public.targets t where t.learner_id=learner_uuid and t.class_id=class_uuid
    and t.unit_id=unit_row.id and t.automation_key is not null and t.status='active' and t.archived_at is null loop
    complete:=case when prior_goal.evidence->>'teaching_week'='1' then baseline_done else exists(
      select 1 from public.learner_curriculum_progress p where p.learner_id=learner_uuid and p.unit_code=unit_row.code
        and p.topic_code=prior_goal.evidence->>'topic_code'
        and (p.mastered_at is not null or (p.independent_attempts>=3 and p.mastery_score>=80))) end;
    if complete then update public.targets set status='achieved',current_progress=100,
      review_result='Required completion evidence recorded automatically.',final_outcome='achieved',next_action='Continue to the next available teaching week.'
      where id=prior_goal.id; end if;
  end loop;

  select w.* into chosen from public.learning_journey_weeks w
  where w.template_id=journey.template_id and w.teaching_week<=greatest(coalesce(journey.teaching_week,1),1)
    and not (case when w.teaching_week=1 then baseline_done else exists(
      select 1 from public.learner_curriculum_progress p where p.learner_id=learner_uuid and p.unit_code=unit_row.code
        and p.topic_code=w.configuration->>'topic_code'
        and (p.mastered_at is not null or (p.independent_attempts>=3 and p.mastery_score>=80))) end)
  order by w.teaching_week limit 1;

  select * into latest from public.learner_curriculum_attempts a where a.learner_id=learner_uuid
    and a.unit_code=unit_row.code and a.kind='topic_practice' order by a.completed_at desc,a.id desc limit 1;
  if latest.id is not null then
    select a.percentage into previous_score from public.learner_curriculum_attempts a where a.learner_id=learner_uuid
      and a.unit_code=unit_row.code and a.kind='topic_practice' and a.topic_code=latest.topic_code
      and a.completed_at<latest.completed_at order by a.completed_at desc,a.id desc limit 1;
    feedback_text:=format('Your latest Unit %s, topic %s practice score is %s%%. %s',unit_row.code,latest.topic_code,latest.percentage,
      case when latest.percentage<80 then 'Review the answers you missed, use the worked examples, and try the practice again.'
        else 'Good result. Complete the remaining required work for this teaching week.' end);
    praise_text:=case when latest.percentage>previous_score then format('Well done: your topic %s score improved from %s%% to %s%%.',latest.topic_code,previous_score,latest.percentage)
      when latest.percentage>=80 then format('Well done: you scored %s%% on topic %s practice.',latest.percentage,latest.topic_code)
      else 'Thank you for completing the practice. Each recorded attempt helps identify what to work on next.' end;
    feedback_evidence:=jsonb_build_object('source','automatic_learning_admin','curriculum_attempt_id',latest.id,'recorded_at',latest.completed_at,'unit_code',unit_row.code);
  else
    feedback_text:=case when baseline_done then 'Your starting point is recorded. Continue with the next available teaching week; later practice will show your progress.'
      else 'Complete your starting-point assessment so the portal can choose suitable practice for you.' end;
    praise_text:=case when baseline_done then 'Well done for completing your starting-point assessment.' else null end;
    feedback_evidence:=jsonb_build_object('source','automatic_learning_admin','starting_point_recorded',baseline_done,'unit_code',unit_row.code);
  end if;

  if chosen.teaching_week is not null then
    topic_code_value:=chosen.configuration->>'topic_code';
    goal_text:=case when chosen.teaching_week=1 then format('Complete the Unit %s starting-point assessment.',unit_row.code)
      else format('Finish the topic practice for Teaching Week %s: Unit %s topic %s.',chosen.teaching_week,unit_row.code,coalesce(topic_code_value,'activities')) end;
    insert into public.targets(learner_id,class_id,course_id,unit_id,level,target_text,reason,target_date,review_on,success_measure,status,evidence,automation_key)
    values(learner_uuid,class_uuid,unit_row.course_id,unit_row.id,'weekly',goal_text,
      'This is the earliest available teaching week without the required completion evidence.',
      today+(7-extract(isodow from today)::integer),today+(7-extract(isodow from today)::integer),
      case when chosen.teaching_week=1 then 'A saved starting-point assessment; no pass score is required.'
        else 'Required completion recorded, or at least three independent attempts with a mastery score of 80% or more.' end,
      'active',jsonb_build_object('source','automatic_learning_admin','journey_id',journey.journey_id,'teaching_week',chosen.teaching_week,
        'topic_code',topic_code_value,'unit_code',unit_row.code,'automatic_feedback',feedback_text,'appreciation',praise_text),
      journey.journey_id::text||':'||learner_uuid::text||':'||chosen.teaching_week::text)
    on conflict (automation_key) where automation_key is not null do update
      set evidence=public.targets.evidence||excluded.evidence
    returning id into goal_id;
  else
    feedback_text:=feedback_text||' Your currently available topic-practice targets are complete. Follow your next learning task for any project or checkpoint evidence.';
  end if;
  insert into public.learner_automation_summaries(learner_id,class_id,target_id,feedback,appreciation,evidence)
    values(learner_uuid,class_uuid,goal_id,feedback_text,praise_text,feedback_evidence)
    on conflict(learner_id,class_id) do update set target_id=excluded.target_id,feedback=excluded.feedback,
      appreciation=excluded.appreciation,evidence=excluded.evidence,updated_at=now();
end $$;
revoke all on function public.refresh_learner_automation(uuid,uuid) from public,anon;
grant execute on function public.refresh_learner_automation(uuid,uuid) to authenticated;

-- Legacy automatically generated skill targets no longer wait for a teacher's approval.
create function public.activate_automatic_target() returns trigger language plpgsql set search_path='' as $$
begin
  if new.approved_by is null and new.evidence ? 'attempt_id' and new.status='proposed' then
    new.status:='active'; new.review_on:=coalesce(new.review_on,new.target_date);
    new.evidence:=new.evidence||jsonb_build_object('automatically_activated',true);
  end if;
  return new;
end $$;
create trigger activate_automatic_target before insert on public.targets for each row execute function public.activate_automatic_target();
