-- Refine the authoritative activity-state projection after live role testing.
-- The official retention assessment shares the topic schedule created by the
-- mastery engine, and incomplete attempts are explicitly represented.

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
  incomplete_attempt public.attempts;
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
    latest_attempt:=null;
    incomplete_attempt:=null;
    select x.* into latest_attempt from public.attempts x
    where x.learner_id=learner_uuid and x.activity_id=activity_row.id
      and x.completed_at is not null
    order by x.completed_at desc limit 1;
    if latest_attempt.id is null then
      select x.* into incomplete_attempt from public.attempts x
      where x.learner_id=learner_uuid and x.activity_id=activity_row.id
        and x.completed_at is null
      order by x.started_at desc limit 1;
    end if;
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
        and rs.status in ('scheduled','available')
        and (
          rs.review_activity_id=activity_row.id
          or (
            activity_row.assessment_kind='retention_check'
            and rs.topic_id=(select l.topic_id from public.lessons l where l.id=lesson_uuid)
          )
        );
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
      status_detail:=format('%s · %s%%',state,round(latest_attempt.percentage));
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
          where lr.learner_id=learner_uuid and l.id=lesson_uuid
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
    if incomplete_attempt.id is not null then
      state:='In Progress';status_detail:='In Progress';
    elsif overridden then state:='Available';status_detail:='Teacher override';
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

revoke all on function public.learner_activity_states(uuid,uuid) from public;
grant execute on function public.learner_activity_states(uuid,uuid) to authenticated;
