-- Surface the first overdue journey week for each learner. This is a read-only
-- teacher signal: the student access rule remains enforced by the application.

create or replace function public.class_learner_weekly_gaps(
  class_uuid uuid,
  as_of date default current_date
) returns table(
  learner_id uuid,
  display_name text,
  overdue_teaching_week integer,
  topic_code text,
  attention_reason text
)
language plpgsql stable security definer set search_path=''
as $$
declare
  actor public.user_profiles;
  active_journey public.group_learning_journeys;
  active_unit public.units;
  current_week integer;
begin
  actor:=public.current_profile();
  if actor.id is null or actor.role not in ('teacher','administrator')
    or not public.can_manage_class(class_uuid) then
    raise exception 'class_not_available' using errcode='42501';
  end if;

  select journey.* into active_journey
  from public.group_learning_journeys journey
  where journey.class_id=class_uuid and journey.status='active'
    and journey.archived_at is null
  order by journey.started_at desc limit 1;
  if active_journey.id is null then return; end if;

  select * into active_unit from public.units
  where id=active_journey.unit_id and archived_at is null;
  select position.teaching_week into current_week
  from public.current_class_learning_journey(class_uuid,as_of) position;
  if active_unit.id is null or coalesce(current_week,1)<=1 then return; end if;

  return query
  with learners as (
    select profile.id,profile.display_name
    from public.enrolments enrolment
    join public.user_profiles profile on profile.id=enrolment.student_id
      and profile.role='student' and profile.archived_at is null
    where enrolment.class_id=class_uuid and enrolment.archived_at is null
  )
  select learner.id,learner.display_name,gap.teaching_week,gap.topic_code,
    'Teaching Week '||gap.teaching_week||' required work is incomplete. '
      ||'Teaching Week '||current_week||' remains locked.'
  from learners learner
  join lateral (
    select journey_week.teaching_week,
      nullif(journey_week.configuration->>'topic_code','') topic_code
    from public.learning_journey_weeks journey_week
    where journey_week.template_id=active_journey.template_id
      and journey_week.teaching_week<current_week
      and not (
        case when journey_week.teaching_week=1 then
          exists(
            select 1 from public.unit_starting_point_baselines baseline
            where baseline.learner_id=learner.id
              and baseline.unit_id=active_unit.id
          ) or exists(
            select 1 from public.learner_curriculum_progress progress,
              lateral pg_catalog.jsonb_array_elements(progress.evidence) evidence
            where progress.learner_id=learner.id
              and progress.unit_code=active_unit.code
              and evidence->>'kind'='initial_diagnostic'
          )
        else exists(
          select 1 from public.learner_curriculum_progress progress
          where progress.learner_id=learner.id
            and progress.unit_code=active_unit.code
            and progress.topic_code=journey_week.configuration->>'topic_code'
            and (
              progress.mastered_at is not null
              or (progress.independent_attempts>=3 and progress.mastery_score>=80)
            )
        ) end
      )
    order by journey_week.teaching_week
    limit 1
  ) gap on true;
end;
$$;

revoke all on function public.class_learner_weekly_gaps(uuid,date)
  from public,anon;
grant execute on function public.class_learner_weekly_gaps(uuid,date)
  to authenticated;

comment on function public.class_learner_weekly_gaps(uuid,date) is
  'Returns each learner first incomplete teaching week before the current class week for automatic teacher attention.';
