-- One evidence-backed answer to "Who needs me?" for every managed class.

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
  active_unit_code text;
  current_week integer;
begin
  actor:=public.current_profile();
  if actor.id is null or actor.role not in ('teacher','administrator')
    or not public.can_manage_class(class_uuid) then
    raise exception 'class_not_available' using errcode='42501';
  end if;
  select unit.code into active_unit_code from public.classes class
  left join public.units unit on unit.id=class.active_unit_id
  where class.id=class_uuid;
  select position.teaching_week into current_week
  from public.current_class_learning_journey(class_uuid,current_date) position;

  return query
  with learners as (
    select profile.id,profile.display_name
    from public.enrolments enrolment
    join public.user_profiles profile on profile.id=enrolment.student_id and profile.archived_at is null
    where enrolment.class_id=class_uuid and enrolment.archived_at is null
  )
  select learner.id,learner.display_name,baseline.percentage,current_evidence.percentage,
    comparison.improvement_points,
    case catch_up.severity when 4 then 'intervention_required'
      when 3 then 'action_required' when 2 then 'catch_up_required'
      when 1 then 'reminder' when 0 then case when catch_up.open_count>0 then 'in_progress' else 'complete' end
      else 'complete' end,
    coalesce(outstanding.count,0),
    case
      when intervention.exists_flag or catch_up.severity=4 then 'intervention_required'
      when catch_up.severity=3 then 'action_required'
      when catch_up.open_count>0 or coalesce(outstanding.overdue_count,0)>0 then 'catch_up_required'
      when current_evidence.percentage is not null and current_evidence.percentage>=85 then 'exceeding'
      when current_evidence.percentage is not null and current_evidence.percentage<50 then 'action_required'
      when current_evidence.percentage is null and coalesce(current_week,1)>1 then 'action_required'
      else 'on_track'
    end,
    case
      when intervention.exists_flag then 'An open intervention requires professional review.'
      when catch_up.severity=4 then 'Catch-up remains incomplete after the intervention threshold.'
      when catch_up.severity=3 then 'Catch-up remains incomplete after the action threshold.'
      when catch_up.severity=2 then 'Structured catch-up is required.'
      when catch_up.severity=1 then 'A catch-up reminder is due.'
      when catch_up.open_count>0 then 'Structured catch-up is in progress.'
      when coalesce(outstanding.overdue_count,0)>0 then outstanding.overdue_count||' allocated item(s) are overdue.'
      when current_evidence.percentage is not null and current_evidence.percentage>=85 then 'Current independent evidence is at least 85%.'
      when current_evidence.percentage is not null and current_evidence.percentage<50 then 'Latest completed evidence is below 50%.'
      when current_evidence.percentage is null and coalesce(current_week,1)>1 then 'No completed evidence is recorded after Teaching Week 1.'
      when current_evidence.percentage is null then 'Journey started; awaiting the first completed evidence.'
      else 'No overdue catch-up, open intervention or low current evidence is recorded.'
    end
  from learners learner
  left join lateral (
    select attempt.percentage from public.assessment_instances instance
    join public.attempts attempt on attempt.id=instance.attempt_id
    where instance.learner_id=learner.id and instance.class_id=class_uuid
      and instance.kind='unit_starting_point' and instance.completed_at is not null
    order by instance.completed_at limit 1
  ) baseline on true
  left join lateral (
    select evidence.percentage from (
      select curriculum.percentage,curriculum.completed_at
      from public.learner_curriculum_attempts curriculum
      where curriculum.learner_id=learner.id and curriculum.unit_code=active_unit_code
      union all
      select attempt.percentage,attempt.completed_at
      from public.attempts attempt
      join public.activities activity on activity.id=attempt.activity_id
      join public.lessons lesson on lesson.id=activity.lesson_id
      join public.topics topic on topic.id=lesson.topic_id
      join public.units unit on unit.id=topic.unit_id
      where attempt.learner_id=learner.id and unit.code=active_unit_code
        and attempt.completed_at is not null
    ) evidence order by evidence.completed_at desc limit 1
  ) current_evidence on true
  left join lateral (
    select round(avg(comparison.improvement_points),2) as improvement_points
    from public.skill_progress_comparisons comparison
    join public.skills skill on skill.id=comparison.skill_id
    join public.topics topic on topic.id=skill.topic_id
    join public.units unit on unit.id=topic.unit_id
    where comparison.learner_id=learner.id and unit.code=active_unit_code
      and comparison.improvement_points is not null
  ) comparison on true
  left join lateral (
    select count(*)::integer as open_count,coalesce(max(case
      when catch_record.completed_at is not null then 0
      when coalesce(current_week,catch_record.opened_teaching_week)-catch_record.opened_teaching_week>=policy.intervention_after_teaching_weeks then 4
      when coalesce(current_week,catch_record.opened_teaching_week)-catch_record.opened_teaching_week>=policy.action_after_teaching_weeks then 3
      when coalesce(current_week,catch_record.opened_teaching_week)-catch_record.opened_teaching_week>=policy.required_after_teaching_weeks then 2
      when coalesce(current_week,catch_record.opened_teaching_week)-catch_record.opened_teaching_week>=policy.reminder_after_teaching_weeks then 1
      else 0 end),0)::integer as severity
    from public.learner_catch_up_records catch_record
    join public.classes class on class.id=catch_record.class_id
    join public.catch_up_policies policy on policy.organisation_id=class.organisation_id
    where catch_record.learner_id=learner.id and catch_record.class_id=class_uuid
      and catch_record.completed_at is null
  ) catch_up on true
  left join lateral (
    select count(*)::integer as count,
      count(*) filter(where allocation.deadline_at<now())::integer as overdue_count
    from public.activity_allocations allocation
    where allocation.class_id=class_uuid and allocation.archived_at is null
      and not exists(select 1 from public.attempts attempt
        where attempt.learner_id=learner.id and attempt.activity_id=allocation.activity_id
          and attempt.completed_at is not null)
  ) outstanding on true
  left join lateral (
    select exists(select 1 from public.interventions intervention
      where intervention.learner_id=learner.id and intervention.class_id=class_uuid
        and intervention.status='open') as exists_flag
  ) intervention on true
  order by case
    when intervention.exists_flag or catch_up.severity=4 then 1
    when catch_up.severity=3 then 2
    when catch_up.open_count>0 or coalesce(outstanding.overdue_count,0)>0 then 3
    when current_evidence.percentage is not null and current_evidence.percentage>=85 then 5
    else 4 end,learner.display_name;
end;
$$;

revoke all on function public.class_learner_attention(uuid) from public,anon;
grant execute on function public.class_learner_attention(uuid) to authenticated;
comment on function public.class_learner_attention(uuid) is
  'Evidence-backed class priority list. Status labels accompany colour and do not infer attendance or fabricate outcomes.';
