-- Make every new activity allocation attributable to one exact class and bind
-- completed attempts to the allocation that prompted them. Historical rows are
-- retained, but ambiguous learner-only allocations are not guessed into a class.

alter table public.activity_allocations
  add column if not exists class_scope_source text;

with inferred_scope as (
  select allocation.id,(array_agg(distinct enrolment.class_id))[1] as class_id
  from public.activity_allocations allocation
  join public.activities activity on activity.id=allocation.activity_id
  join public.lessons lesson on lesson.id=activity.lesson_id
  join public.topics topic on topic.id=lesson.topic_id
  join public.enrolments enrolment on enrolment.student_id=allocation.learner_id
    and enrolment.archived_at is null
  join public.classes class on class.id=enrolment.class_id
    and class.archived_at is null
  join public.class_units class_unit on class_unit.class_id=class.id
    and class_unit.unit_id=topic.unit_id
    and class_unit.active
    and class_unit.archived_at is null
  where allocation.class_id is null and allocation.learner_id is not null
  group by allocation.id
  having count(distinct enrolment.class_id)=1
)
update public.activity_allocations allocation set
  class_id=inferred_scope.class_id,
  class_scope_source='inferred_unique_enrolment'
from inferred_scope where inferred_scope.id=allocation.id;

update public.activity_allocations set class_scope_source=case
  when class_id is not null then 'legacy_class'
  else 'legacy_unscoped'
end where class_scope_source is null;

do $$
declare constraint_row record;
begin
  for constraint_row in
    select constraint_data.conname
    from pg_constraint constraint_data
    where constraint_data.conrelid='public.activity_allocations'::regclass
      and constraint_data.contype='c'
      and pg_get_constraintdef(constraint_data.oid) like '%class_id%learner_id%'
  loop
    execute format(
      'alter table public.activity_allocations drop constraint %I',
      constraint_row.conname
    );
  end loop;
end $$;

alter table public.activity_allocations
  alter column class_scope_source set default 'explicit',
  alter column class_scope_source set not null,
  add constraint activity_allocations_recipient_check
    check(class_id is not null or learner_id is not null),
  add constraint activity_allocations_scope_source_check
    check(class_scope_source in (
      'explicit','legacy_class','inferred_unique_enrolment','legacy_unscoped'
    ));

create index if not exists activity_allocations_class_learner_release_idx
  on public.activity_allocations(class_id,learner_id,release_at)
  where archived_at is null;

-- Allocations are configuration facts. Authenticated clients may read the rows
-- allowed by RLS, but mutation is confined to audited security-definer RPCs.
drop policy if exists allocations_staff_write on public.activity_allocations;
revoke insert,update,delete on public.activity_allocations from authenticated;

create or replace function public.teacher_allocate_activity(
  activity_uuid uuid,
  class_uuid uuid,
  learner_uuid uuid,
  pathway_value text,
  release_value timestamptz,
  deadline_value timestamptz,
  required_value boolean
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; allocation_uuid uuid;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role='administrator' and archived_at is null;
  if actor.id is null then
    raise exception 'not_authorised' using errcode='42501';
  end if;
  if class_uuid is null
    or pathway_value not in ('Support','Core','Stretch','Mastery')
    or (deadline_value is not null
      and deadline_value<=coalesce(release_value,now())) then
    raise exception 'invalid_allocation' using errcode='22023';
  end if;
  if not public.can_manage_class(class_uuid)
    or not exists(select 1 from public.classes class
      where class.id=class_uuid and class.organisation_id=actor.organisation_id
        and class.archived_at is null) then
    raise exception 'class_not_available' using errcode='42501';
  end if;
  if learner_uuid is not null and not exists(
    select 1 from public.enrolments enrolment
    join public.user_profiles learner on learner.id=enrolment.student_id
    where enrolment.class_id=class_uuid and enrolment.student_id=learner_uuid
      and enrolment.archived_at is null and learner.role='student'
      and learner.archived_at is null
  ) then
    raise exception 'learner_not_enrolled' using errcode='42501';
  end if;
  if not exists(
    select 1 from public.activities activity
    join public.lessons lesson on lesson.id=activity.lesson_id
    join public.topics topic on topic.id=lesson.topic_id
    join public.class_units class_unit on class_unit.unit_id=topic.unit_id
    where activity.id=activity_uuid and activity.status='approved'
      and activity.archived_at is null and class_unit.class_id=class_uuid
      and class_unit.active and class_unit.archived_at is null
  ) then
    raise exception 'activity_not_available_for_class' using errcode='42501';
  end if;
  insert into public.activity_allocations(
    activity_id,class_id,learner_id,allocated_pathway,release_at,deadline_at,
    required,allocated_by,class_scope_source
  ) values(
    activity_uuid,class_uuid,learner_uuid,pathway_value::public.pathway,
    release_value,deadline_value,required_value,actor.id,'explicit'
  ) returning id into allocation_uuid;
  insert into public.audit_logs(
    organisation_id,actor_id,action,entity_type,entity_id,after_data
  ) values(
    actor.organisation_id,actor.id,'activity.allocated','activity_allocation',
    allocation_uuid,jsonb_build_object(
      'activity_id',activity_uuid,'class_id',class_uuid,
      'learner_id',learner_uuid,'class_scope_source','explicit'
    )
  );
  return allocation_uuid;
end $$;

create or replace function public.teacher_allocate_adaptive_homework(
  topic_uuid uuid,
  class_uuid uuid,
  learner_uuid uuid,
  pathway_mode text,
  release_value timestamptz,
  deadline_value timestamptz,
  expected_minutes_value integer,
  required_value boolean
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  actor public.user_profiles;
  learner_row record;
  selected_pathway public.pathway;
  selected_stage public.learning_stage;
  activity_uuid uuid;
  allocation_uuid uuid;
  allocations jsonb:='[]';
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role='administrator' and archived_at is null;
  if actor.id is null then
    raise exception 'not_authorised' using errcode='42501';
  end if;
  if class_uuid is null
    or pathway_mode not in ('Auto','Support','Core','Stretch','Mastery')
    or release_value is null or deadline_value is null
    or deadline_value<=release_value
    or expected_minutes_value not between 5 and 120 then
    raise exception 'invalid_adaptive_homework' using errcode='22023';
  end if;
  if not public.can_manage_class(class_uuid)
    or not exists(select 1 from public.classes class
      where class.id=class_uuid and class.organisation_id=actor.organisation_id
        and class.archived_at is null) then
    raise exception 'class_not_available' using errcode='42501';
  end if;
  if not exists(
    select 1 from public.topics topic
    join public.class_units class_unit on class_unit.unit_id=topic.unit_id
    where topic.id=topic_uuid and topic.status='approved'
      and topic.archived_at is null and class_unit.class_id=class_uuid
      and class_unit.active and class_unit.archived_at is null
  ) then
    raise exception 'topic_not_available_for_class' using errcode='42501';
  end if;
  if learner_uuid is not null and not exists(
    select 1 from public.enrolments enrolment
    join public.user_profiles learner on learner.id=enrolment.student_id
    where enrolment.class_id=class_uuid and enrolment.student_id=learner_uuid
      and enrolment.archived_at is null and learner.role='student'
      and learner.archived_at is null
  ) then
    raise exception 'learner_not_enrolled' using errcode='42501';
  end if;

  for learner_row in
    select learner.id learner_id
    from public.enrolments enrolment
    join public.user_profiles learner on learner.id=enrolment.student_id
    where enrolment.class_id=class_uuid and enrolment.archived_at is null
      and learner.role='student' and learner.archived_at is null
      and (learner_uuid is null or learner.id=learner_uuid)
    order by learner.id
  loop
    if pathway_mode='Auto' then
      select coalesce((
        select mastery.current_pathway from public.skill_mastery mastery
        join public.skills skill on skill.id=mastery.skill_id
        where mastery.learner_id=learner_row.learner_id
          and skill.topic_id=topic_uuid
        order by mastery.mastery_score asc limit 1
      ),'Support'::public.pathway) into selected_pathway;
    else
      selected_pathway:=pathway_mode::public.pathway;
    end if;
    selected_stage:=case selected_pathway
      when 'Support' then 'guided_practice'::public.learning_stage
      when 'Core' then 'core_practice'::public.learning_stage
      when 'Stretch' then 'challenge_practice'::public.learning_stage
      else 'mastery_check'::public.learning_stage end;
    select activity.id into activity_uuid
    from public.activities activity
    join public.lessons lesson on lesson.id=activity.lesson_id
    where lesson.topic_id=topic_uuid and activity.learning_stage=selected_stage
      and activity.status='approved' and activity.archived_at is null
    order by activity.estimated_minutes,activity.id limit 1;
    if activity_uuid is null then
      select activity.id into activity_uuid
      from public.activities activity
      join public.lessons lesson on lesson.id=activity.lesson_id
      where lesson.topic_id=topic_uuid
        and activity.learning_stage='core_practice'
        and activity.status='approved' and activity.archived_at is null
      order by activity.estimated_minutes,activity.id limit 1;
    end if;
    if activity_uuid is null then
      raise exception 'approved_homework_not_available' using errcode='22023';
    end if;
    insert into public.activity_allocations(
      activity_id,class_id,learner_id,allocated_pathway,release_at,deadline_at,
      required,allocated_by,allocation_mode,expected_minutes,class_scope_source
    ) values(
      activity_uuid,class_uuid,learner_row.learner_id,selected_pathway,
      release_value,deadline_value,required_value,actor.id,
      case when pathway_mode='Auto' then 'auto' else 'manual' end,
      expected_minutes_value,'explicit'
    ) returning id into allocation_uuid;
    allocations:=allocations||jsonb_build_array(jsonb_build_object(
      'allocationId',allocation_uuid,'classId',class_uuid,
      'learnerId',learner_row.learner_id,'activityId',activity_uuid,
      'pathway',selected_pathway
    ));
  end loop;
  if jsonb_array_length(allocations)=0 then
    raise exception 'class_has_no_active_learners' using errcode='22023';
  end if;
  insert into public.audit_logs(
    organisation_id,actor_id,action,entity_type,after_data
  ) values(
    actor.organisation_id,actor.id,'adaptive_homework.allocated',
    'activity_allocation',jsonb_build_object(
      'class_id',class_uuid,'learner_id',learner_uuid,
      'topic_id',topic_uuid,'mode',pathway_mode,'allocations',allocations
    )
  );
  return jsonb_build_object(
    'count',jsonb_array_length(allocations),'allocations',allocations
  );
end $$;

-- The mature marking engine remains unchanged. This wrapper selects one
-- released, applicable allocation, lets the marking transaction complete, then
-- records the exact allocation on the returned attempt.
create or replace function public.submit_activity(
  activity_uuid uuid,submitted_answers jsonb,hint_count integer default 0
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  actor public.user_profiles;
  lesson_uuid uuid;
  activity_state text;
  selected_allocation uuid;
  result jsonb;
  attempt_uuid uuid;
begin
  actor:=public.current_profile();
  if actor.role<>'student' then
    raise exception 'student_submission_only' using errcode='42501';
  end if;
  select lesson_id into lesson_uuid from public.activities where id=activity_uuid;
  select state into activity_state
  from public.learner_activity_states(lesson_uuid,actor.id) state_row
  where state_row.activity_id=activity_uuid;
  if activity_state is null or activity_state not in (
    'Available','Completed','Mastery Demonstrated','Additional Practice Required'
  ) then
    raise exception 'activity_locked' using errcode='42501';
  end if;

  perform pg_advisory_xact_lock(hashtext(actor.id::text||':'||activity_uuid::text));
  select allocation.id into selected_allocation
  from public.activity_allocations allocation
  where allocation.activity_id=activity_uuid
    and allocation.class_id is not null
    and allocation.archived_at is null
    and (allocation.release_at is null or allocation.release_at<=now())
    and (allocation.learner_id is null or allocation.learner_id=actor.id)
    and exists(
      select 1 from public.enrolments enrolment
      where enrolment.class_id=allocation.class_id
        and enrolment.student_id=actor.id and enrolment.archived_at is null
    )
    and not exists(
      select 1 from public.attempts attempt
      where attempt.allocation_id=allocation.id and attempt.learner_id=actor.id
        and attempt.completed_at is not null
    )
  order by (allocation.learner_id is not null) desc,allocation.required desc,
    allocation.deadline_at nulls last,allocation.created_at,allocation.id
  limit 1;

  result:=public.submit_activity_mark_and_record(
    activity_uuid,submitted_answers,hint_count
  );
  attempt_uuid:=(result->>'attemptId')::uuid;
  if selected_allocation is not null then
    update public.attempts set allocation_id=selected_allocation
    where id=attempt_uuid and learner_id=actor.id and activity_id=activity_uuid;
  end if;
  return result;
end;
$$;

-- Automatic targets inherit the exact class from allocation evidence. For old
-- unlinked attempts a class is inferred only when one active selected-unit
-- enrolment is possible.
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
  select * into source_activity from public.activities
    where id=source_attempt.activity_id;
  if source_activity.assessment_kind='course_starting_point' then
    return null;
  end if;
  select topic.id,topic.unit_id,unit.course_id
    into source_topic,source_unit,source_course
  from public.lessons lesson
  join public.topics topic on topic.id=lesson.topic_id
  join public.units unit on unit.id=topic.unit_id
  where lesson.id=source_activity.lesson_id;

  select allocation.class_id into source_class
  from public.activity_allocations allocation
  where allocation.id=source_attempt.allocation_id;
  if source_class is null then
    select (array_agg(distinct enrolment.class_id))[1] into source_class
    from public.enrolments enrolment
    join public.classes class on class.id=enrolment.class_id
      and class.archived_at is null
    join public.class_units class_unit on class_unit.class_id=class.id
      and class_unit.unit_id=source_unit and class_unit.active
      and class_unit.archived_at is null
    where enrolment.student_id=new.learner_id
      and enrolment.archived_at is null
    having count(distinct enrolment.class_id)=1;
  end if;
  new.topic_id:=source_topic;
  new.unit_id:=source_unit;
  new.course_id:=source_course;
  new.class_id:=source_class;
  if new.skill_id is null and new.evidence ? 'skill_id' then
    new.skill_id:=(new.evidence->>'skill_id')::uuid;
  end if;
  select activity.id into new.linked_activity_id
  from public.activities activity
  join public.lessons lesson on lesson.id=activity.lesson_id
  where lesson.topic_id=source_topic and activity.status='approved'
    and activity.archived_at is null and activity.learning_stage in (
      'guided_practice','core_practice','challenge_practice'
    )
  order by case activity.learning_stage when 'core_practice' then 1
    when 'guided_practice' then 2 else 3 end limit 1;
  new.success_measure:=coalesce(
    new.success_measure,
    'Complete the linked practice and meet the stated review percentage.'
  );
  return new;
end;
$$;

-- Class attention now counts only released required work that applies to the
-- exact learner in the exact class. It also surfaces overdue active targets,
-- repeated low evidence and declining comparable progress without inventing
-- attendance or engagement facts.
create or replace function public.class_learner_attention(class_uuid uuid)
returns table(
  learner_id uuid,
  display_name text,
  starting_score numeric,
  current_score numeric,
  progress_points numeric,
  catch_up_status text,
  outstanding_count integer,
  attention_status text,
  attention_reason text
)
language plpgsql stable security definer set search_path=''
as $$
declare
  actor public.user_profiles;
  active_unit_uuid uuid;
  active_unit_code text;
  current_week integer;
begin
  actor:=public.current_profile();
  if actor.id is null or actor.role not in ('teacher','administrator')
    or not public.can_manage_class(class_uuid) then
    raise exception 'class_not_available' using errcode='42501';
  end if;
  select unit.id,unit.code into active_unit_uuid,active_unit_code
  from public.classes class
  left join public.units unit on unit.id=class.active_unit_id
  where class.id=class_uuid;
  select position.teaching_week into current_week
  from public.current_class_learning_journey(class_uuid,current_date) position;

  return query
  with learners as (
    select profile.id,profile.display_name
    from public.enrolments enrolment
    join public.user_profiles profile on profile.id=enrolment.student_id
      and profile.archived_at is null
    where enrolment.class_id=class_uuid and enrolment.archived_at is null
  )
  select learner.id,learner.display_name,baseline.percentage,
    current_evidence.percentage,comparison.improvement_points,
    case catch_up.severity when 4 then 'intervention_required'
      when 3 then 'action_required' when 2 then 'catch_up_required'
      when 1 then 'reminder' when 0 then case when catch_up.open_count>0
        then 'in_progress' else 'complete' end
      else 'complete' end,
    coalesce(outstanding.count,0),
    case
      when intervention.exists_flag or catch_up.severity=4
        then 'intervention_required'
      when catch_up.severity=3 then 'action_required'
      when coalesce(overdue_target.count,0)>0 then 'action_required'
      when coalesce(repeated_low.count,0)>=2 then 'action_required'
      when catch_up.open_count>0 or coalesce(outstanding.overdue_count,0)>0
        then 'catch_up_required'
      when comparison.improvement_points<0 then 'action_required'
      when current_evidence.percentage is not null
        and current_evidence.percentage>=85 then 'exceeding'
      when current_evidence.percentage is not null
        and current_evidence.percentage<50 then 'action_required'
      when current_evidence.percentage is null and coalesce(current_week,1)>1
        then 'action_required'
      else 'on_track'
    end,
    case
      when intervention.exists_flag
        then 'An open intervention requires professional review.'
      when catch_up.severity=4
        then 'Catch-up remains incomplete after the intervention threshold.'
      when catch_up.severity=3
        then 'Catch-up remains incomplete after the action threshold.'
      when coalesce(overdue_target.count,0)>0
        then overdue_target.count||' active target(s) are overdue.'
      when coalesce(repeated_low.count,0)>=2
        then repeated_low.count||' of the latest three attempts in one module are below 50%.'
      when catch_up.severity=2 then 'Structured catch-up is required.'
      when catch_up.severity=1 then 'A catch-up reminder is due.'
      when catch_up.open_count>0 then 'Structured catch-up is in progress.'
      when coalesce(outstanding.overdue_count,0)>0
        then outstanding.overdue_count||' required allocated item(s) are overdue.'
      when comparison.improvement_points<0
        then 'Comparable skill evidence has declined by '
          ||abs(comparison.improvement_points)||' percentage point(s).'
      when current_evidence.percentage is not null
        and current_evidence.percentage>=85
        then 'Current independent evidence is at least 85%.'
      when current_evidence.percentage is not null
        and current_evidence.percentage<50
        then 'Latest completed evidence is below 50%.'
      when current_evidence.percentage is null and coalesce(current_week,1)>1
        then 'No completed evidence is recorded after Teaching Week 1.'
      when current_evidence.percentage is null
        then 'Journey started; awaiting the first completed evidence.'
      else 'No overdue target, required allocation, catch-up, intervention or low current evidence is recorded.'
    end
  from learners learner
  left join lateral (
    select attempt.percentage from public.assessment_instances instance
    join public.attempts attempt on attempt.id=instance.attempt_id
    where instance.learner_id=learner.id and instance.class_id=class_uuid
      and instance.kind='unit_starting_point'
      and instance.completed_at is not null
    order by instance.completed_at limit 1
  ) baseline on true
  left join lateral (
    select evidence.percentage from (
      select curriculum.percentage,curriculum.completed_at
      from public.learner_curriculum_attempts curriculum
      where curriculum.learner_id=learner.id
        and curriculum.unit_code=active_unit_code
      union all
      select attempt.percentage,attempt.completed_at
      from public.attempts attempt
      join public.activities activity on activity.id=attempt.activity_id
      join public.lessons lesson on lesson.id=activity.lesson_id
      join public.topics topic on topic.id=lesson.topic_id
      where attempt.learner_id=learner.id and topic.unit_id=active_unit_uuid
        and attempt.completed_at is not null
        and (
          exists(select 1 from public.activity_allocations allocation
            where allocation.id=attempt.allocation_id
              and allocation.class_id=class_uuid)
          or (attempt.allocation_id is null and 1=(
            select count(distinct enrolment.class_id)
            from public.enrolments enrolment
            join public.class_units class_unit
              on class_unit.class_id=enrolment.class_id
              and class_unit.unit_id=active_unit_uuid
              and class_unit.active and class_unit.archived_at is null
            join public.classes class on class.id=enrolment.class_id
              and class.archived_at is null
            where enrolment.student_id=learner.id
              and enrolment.archived_at is null
          ))
        )
    ) evidence order by evidence.completed_at desc limit 1
  ) current_evidence on true
  left join lateral (
    select round(avg(progress.improvement_points),2) as improvement_points
    from public.skill_progress_comparisons progress
    join public.skills skill on skill.id=progress.skill_id
    join public.topics topic on topic.id=skill.topic_id
    where progress.learner_id=learner.id and topic.unit_id=active_unit_uuid
      and progress.improvement_points is not null
  ) comparison on true
  left join lateral (
    select count(*)::integer as open_count,coalesce(max(case
      when catch_record.completed_at is not null then 0
      when coalesce(current_week,catch_record.opened_teaching_week)
        -catch_record.opened_teaching_week
          >=policy.intervention_after_teaching_weeks then 4
      when coalesce(current_week,catch_record.opened_teaching_week)
        -catch_record.opened_teaching_week
          >=policy.action_after_teaching_weeks then 3
      when coalesce(current_week,catch_record.opened_teaching_week)
        -catch_record.opened_teaching_week
          >=policy.required_after_teaching_weeks then 2
      when coalesce(current_week,catch_record.opened_teaching_week)
        -catch_record.opened_teaching_week
          >=policy.reminder_after_teaching_weeks then 1
      else 0 end),0)::integer as severity
    from public.learner_catch_up_records catch_record
    join public.classes class on class.id=catch_record.class_id
    join public.catch_up_policies policy
      on policy.organisation_id=class.organisation_id
    where catch_record.learner_id=learner.id
      and catch_record.class_id=class_uuid
      and catch_record.completed_at is null
  ) catch_up on true
  left join lateral (
    select count(*)::integer as count
    from public.targets target
    where target.learner_id=learner.id and target.class_id=class_uuid
      and target.status='active' and target.target_date<current_date
      and target.archived_at is null
  ) overdue_target on true
  left join lateral (
    select coalesce(max(module_attempts.low_count),0)::integer as count
    from (
      select recent.topic_id,
        count(*) filter(where recent.percentage<50)::integer as low_count
      from (
        select topic.id as topic_id,attempt.percentage,
          row_number() over(
            partition by topic.id order by attempt.completed_at desc,attempt.id
          ) as recent_order
        from public.attempts attempt
        join public.activities activity on activity.id=attempt.activity_id
        join public.lessons lesson on lesson.id=activity.lesson_id
        join public.topics topic on topic.id=lesson.topic_id
        where attempt.learner_id=learner.id
          and topic.unit_id=active_unit_uuid
          and attempt.completed_at is not null
          and (
            exists(select 1 from public.activity_allocations allocation
              where allocation.id=attempt.allocation_id
                and allocation.class_id=class_uuid)
            or (attempt.allocation_id is null and 1=(
              select count(distinct enrolment.class_id)
              from public.enrolments enrolment
              join public.class_units class_unit
                on class_unit.class_id=enrolment.class_id
                and class_unit.unit_id=active_unit_uuid
                and class_unit.active and class_unit.archived_at is null
              join public.classes class on class.id=enrolment.class_id
                and class.archived_at is null
              where enrolment.student_id=learner.id
                and enrolment.archived_at is null
            ))
          )
      ) recent
      where recent.recent_order<=3
      group by recent.topic_id
    ) module_attempts
  ) repeated_low on true
  left join lateral (
    select count(*)::integer as count,
      count(*) filter(where pending.deadline_at<now())::integer as overdue_count
    from (
      select allocation.*,
        count(*) filter(where allocation.class_scope_source<>'explicit') over(
          partition by allocation.activity_id
          order by allocation.release_at nulls first,allocation.created_at,
            allocation.id rows between unbounded preceding and current row
        ) as legacy_ordinal
      from public.activity_allocations allocation
      where allocation.class_id=class_uuid
        and (allocation.learner_id is null
          or allocation.learner_id=learner.id)
        and allocation.archived_at is null and allocation.required
        and (allocation.release_at is null or allocation.release_at<=now())
    ) pending
    where not exists(
      select 1 from public.attempts attempt
      where attempt.learner_id=learner.id
        and attempt.allocation_id=pending.id
        and attempt.completed_at is not null
    ) and not (
      pending.class_scope_source<>'explicit' and pending.legacy_ordinal<=(
        select count(*) from public.attempts attempt
        where attempt.learner_id=learner.id
          and attempt.activity_id=pending.activity_id
          and attempt.allocation_id is null
          and attempt.completed_at is not null
          and (pending.release_at is null
            or attempt.completed_at>=pending.release_at)
      )
    )
  ) outstanding on true
  left join lateral (
    select exists(
      select 1 from public.interventions intervention
      where intervention.learner_id=learner.id
        and intervention.class_id=class_uuid
        and intervention.status='open'
    ) as exists_flag
  ) intervention on true
  order by case
    when intervention.exists_flag or catch_up.severity=4 then 1
    when catch_up.severity=3 or coalesce(overdue_target.count,0)>0
      or coalesce(repeated_low.count,0)>=2 then 2
    when catch_up.open_count>0 or coalesce(outstanding.overdue_count,0)>0
      then 3
    when comparison.improvement_points<0 then 4
    when current_evidence.percentage is not null
      and current_evidence.percentage>=85 then 6
    else 5 end,learner.display_name;
end;
$$;

revoke all on function public.teacher_allocate_activity(
  uuid,uuid,uuid,text,timestamptz,timestamptz,boolean
) from public,anon;
revoke all on function public.teacher_allocate_adaptive_homework(
  uuid,uuid,uuid,text,timestamptz,timestamptz,integer,boolean
) from public,anon;
revoke all on function public.submit_activity(uuid,jsonb,integer) from public,anon;
grant execute on function public.teacher_allocate_activity(
  uuid,uuid,uuid,text,timestamptz,timestamptz,boolean
) to authenticated;
grant execute on function public.teacher_allocate_adaptive_homework(
  uuid,uuid,uuid,text,timestamptz,timestamptz,integer,boolean
) to authenticated;
grant execute on function public.submit_activity(uuid,jsonb,integer) to authenticated;
revoke all on function public.class_learner_attention(uuid) from public,anon;
grant execute on function public.class_learner_attention(uuid) to authenticated;

comment on column public.activity_allocations.class_scope_source is
  'Whether class scope was recorded explicitly, retained from a legacy class allocation, safely inferred from one enrolment, or remains historically unscoped.';
comment on function public.teacher_allocate_activity(
  uuid,uuid,uuid,text,timestamptz,timestamptz,boolean
) is 'Administrator-only exceptional allocation. Every new row is scoped to one selected-unit class; learner allocations require active enrolment in that exact class.';
comment on function public.teacher_allocate_adaptive_homework(
  uuid,uuid,uuid,text,timestamptz,timestamptz,integer,boolean
) is 'Administrator-only legacy adaptive allocation. Every generated learner row retains its exact class and is audit logged.';
comment on function public.class_learner_attention(uuid) is
  'Evidence-backed exact-class priority list. Counts released required allocations, overdue active targets, repeated low attempts and comparable decline without inferring attendance.';
