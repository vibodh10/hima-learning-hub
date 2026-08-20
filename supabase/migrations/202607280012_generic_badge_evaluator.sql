create or replace function public.evaluate_attempt_badges(attempt_uuid uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  actor public.user_profiles;
  attempt_row public.attempts;
  activity_row record;
  badge_row public.badge_definitions;
  qualifies boolean;
  evidence_value jsonb;
  awarded jsonb:='[]'::jsonb;
  badges_enabled boolean:=true;
  threshold numeric;
begin
  select * into actor from public.user_profiles
  where id=auth.uid() and archived_at is null;
  select * into attempt_row from public.attempts where id=attempt_uuid;
  if actor.id is null or attempt_row.id is null
    or not (attempt_row.learner_id=actor.id
      or actor.role='administrator'
      or public.can_access_learner(attempt_row.learner_id)) then
    raise exception 'attempt_not_available' using errcode='42501';
  end if;

  select a.id,a.required,a.deadline_at,a.learning_stage,l.topic_id,t.unit_id,u.code
  into activity_row
  from public.activities a
  join public.lessons l on l.id=a.lesson_id
  join public.topics t on t.id=l.topic_id
  join public.units u on u.id=t.unit_id
  where a.id=attempt_row.activity_id;

  select coalesce(
    (select gs.badges_enabled from public.gamification_settings gs
      where gs.learner_id=attempt_row.learner_id),
    (select gs.badges_enabled from public.gamification_settings gs
      join public.enrolments e on e.class_id=gs.class_id
      where e.student_id=attempt_row.learner_id and e.archived_at is null
      order by gs.updated_at desc limit 1),
    (select gs.badges_enabled from public.gamification_settings gs
      where gs.organisation_id=actor.organisation_id
        and gs.class_id is null and gs.learner_id is null),
    true
  ) into badges_enabled;
  if not badges_enabled then return awarded; end if;

  for badge_row in
    select bd.* from public.badge_definitions bd
    where bd.organisation_id=actor.organisation_id
      and bd.enabled and bd.archived_at is null
      and not exists(select 1 from public.badge_awards ba
        where ba.learner_id=attempt_row.learner_id and ba.badge_id=bd.id)
  loop
    qualifies:=false;
    evidence_value:=jsonb_build_object('attempt_id',attempt_uuid);

    case badge_row.code
      when 'first-step' then
        threshold:=coalesce((badge_row.criteria->>'completed_activities')::numeric,1);
        select count(distinct activity_id)>=threshold into qualifies
        from public.attempts where learner_id=attempt_row.learner_id and completed_at is not null;
      when 'practice-starter' then
        threshold:=coalesce((badge_row.criteria->>'completed_activities')::numeric,5);
        select count(*)>=threshold into qualifies
        from public.attempts where learner_id=attempt_row.learner_id and completed_at is not null;
      when 'consistent-learner' then
        threshold:=coalesce((badge_row.criteria->>'separate_practice_days')::numeric,3);
        select count(*)>=threshold into qualifies
        from public.practice_days where learner_id=attempt_row.learner_id and scheduled;
      when 'python-explorer' then
        threshold:=coalesce((badge_row.criteria->>'completion')::numeric,100);
        select exists(select 1 from public.topic_progress
          where learner_id=attempt_row.learner_id
            and topic_id=(badge_row.criteria->>'topic_id')::uuid
            and completion_rate>=threshold) into qualifies;
      when 'debugging-detective' then
        threshold:=coalesce((badge_row.criteria->>'correct_count')::numeric,10);
        select count(*)>=threshold into qualifies
        from public.attempt_answers aa
        join public.attempts a on a.id=aa.attempt_id
        join public.questions q on q.id=aa.question_id
        where a.learner_id=attempt_row.learner_id and aa.is_correct
          and q.tags @> array[coalesce(badge_row.criteria->>'tag','debugging')];
      when 'comeback' then
        threshold:=coalesce((badge_row.criteria->>'improvement')::numeric,20);
        select exists(select 1 from public.attempts prior
          where prior.learner_id=attempt_row.learner_id
            and prior.activity_id=attempt_row.activity_id
            and prior.id<>attempt_row.id
            and prior.completed_at<attempt_row.completed_at
            and attempt_row.percentage-prior.percentage>=threshold) into qualifies;
      when 'topic-master' then
        select exists(select 1 from public.skills where topic_id=activity_row.topic_id
          and archived_at is null)
          and not exists(select 1 from public.skills s
            where s.topic_id=activity_row.topic_id and s.archived_at is null
              and not exists(select 1 from public.skill_mastery sm
                where sm.learner_id=attempt_row.learner_id and sm.skill_id=s.id
                  and sm.current_pathway='Mastery')) into qualifies;
      when 'database-builder','web-creator','game-designer','project-planner' then
        threshold:=coalesce((badge_row.criteria->>'topic_completion')::numeric,100);
        select exists(select 1 from public.topic_progress tp
          join public.topics t on t.id=tp.topic_id
          join public.units u on u.id=t.unit_id
          where tp.learner_id=attempt_row.learner_id
            and u.code=badge_row.criteria->>'unit_code'
            and tp.completion_rate>=threshold) into qualifies;
      when 'progress-champion' then
        select exists(select 1 from public.skill_progress_comparisons
          where learner_id=attempt_row.learner_id
            and status=coalesce(badge_row.criteria->>'comparison_status','Significant Improvement')) into qualifies;
      when 'retrieval-master' then
        qualifies:=activity_row.learning_stage='retrieval_review'
          and attempt_row.percentage>=85 and attempt_row.hints_used=0;
      when 'fast-track-achieved' then
        select exists(select 1 from public.learner_routes
          where learner_id=attempt_row.learner_id
            and route=coalesce(badge_row.criteria->>'route','Fast-Tracked')
            and status='active') into qualifies;
      when 'weekly-mastery' then
        select exists(
          select 1 from public.activity_allocations al
          where al.required and al.archived_at is null
            and date_trunc('week',al.release_at)=date_trunc('week',attempt_row.completed_at)
            and (al.learner_id=attempt_row.learner_id or exists(
              select 1 from public.enrolments e
              where e.class_id=al.class_id and e.student_id=attempt_row.learner_id
                and e.archived_at is null))
        ) and not exists(
          select 1 from public.activity_allocations al
          where al.required and al.archived_at is null
            and date_trunc('week',al.release_at)=date_trunc('week',attempt_row.completed_at)
            and (al.learner_id=attempt_row.learner_id or exists(
              select 1 from public.enrolments e
              where e.class_id=al.class_id and e.student_id=attempt_row.learner_id
                and e.archived_at is null))
            and not exists(select 1 from public.attempts done
              where done.learner_id=attempt_row.learner_id
                and done.activity_id=al.activity_id and done.completed_at is not null)
        ) into qualifies;
      else qualifies:=false;
    end case;

    if qualifies then
      insert into public.badge_awards(
        learner_id,badge_id,reason,evidence,source_attempt_id
      ) values(
        attempt_row.learner_id,badge_row.id,badge_row.description,
        evidence_value||jsonb_build_object('criteria',badge_row.criteria),attempt_uuid
      ) on conflict(learner_id,badge_id) do nothing;
      if found then
        awarded:=awarded||jsonb_build_array(jsonb_build_object(
          'code',badge_row.code,'title',badge_row.title
        ));
      end if;
    end if;
  end loop;
  return awarded;
end $$;

revoke all on function public.evaluate_attempt_badges(uuid) from public;
grant execute on function public.evaluate_attempt_badges(uuid) to authenticated;
