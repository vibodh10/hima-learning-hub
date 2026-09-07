-- A course baseline must not grant access to its storage unit.
-- Preserve historical evidence; only teacher-selected units grant student access.
create or replace function public.can_access_unit(unit_uuid uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select
  (select role from public.current_profile()) in ('teacher','administrator')
  or exists(
    select 1 from public.enrolments e
    join public.classes c on c.id=e.class_id
    join public.class_units cu on cu.class_id=c.id
    join public.units u on u.id=cu.unit_id and u.course_id=c.course_id
    where e.student_id=auth.uid() and e.archived_at is null
      and c.archived_at is null and c.published
      and cu.unit_id=unit_uuid and cu.active and cu.archived_at is null
      and u.archived_at is null
  )
$$;
revoke all on function public.can_access_unit(uuid) from public;
grant execute on function public.can_access_unit(uuid) to authenticated;

-- Security-definer activity state/submission paths must enforce the same boundary
-- as table reads; hiding a link or changing RLS alone is not sufficient.
alter function public.learner_activity_states(uuid,uuid)
  rename to learner_activity_states_assigned_internal;
revoke all on function public.learner_activity_states_assigned_internal(uuid,uuid)
  from public,anon,authenticated;
create function public.learner_activity_states(
  lesson_uuid uuid,learner_uuid uuid default auth.uid()
) returns table(
  activity_id uuid,sequence_order integer,state text,status_detail text,
  completed_at timestamptz,percentage numeric,available_on date
)
language plpgsql stable security definer set search_path=''
as $$
declare actor public.user_profiles;
begin
  actor:=public.current_profile();
  if actor.id is null or not public.can_access_learner(learner_uuid) then
    raise exception 'not_authorised' using errcode='42501';
  end if;
  if actor.role='student' and not exists(
    select 1 from public.lessons l join public.topics t on t.id=l.topic_id
    where l.id=lesson_uuid and l.archived_at is null and l.status='approved'
      and (l.release_at is null or l.release_at<=now())
      and t.archived_at is null and t.status='approved'
      and public.can_access_unit(t.unit_id)
  ) then
    raise exception 'unit_not_assigned' using errcode='42501';
  end if;
  return query select * from public.learner_activity_states_assigned_internal(lesson_uuid,learner_uuid);
end;
$$;
revoke all on function public.learner_activity_states(uuid,uuid) from public,anon;
grant execute on function public.learner_activity_states(uuid,uuid) to authenticated;
