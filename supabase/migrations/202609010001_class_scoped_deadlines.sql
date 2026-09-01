-- Keep dated class and assessment events inside the same organisation, class
-- ownership and enrolment boundaries as the rest of the learner evidence.
-- Organisation-wide dates remain visible to the organisation, but only an
-- administrator can create them.

drop policy if exists deadlines_org_read on public.deadlines;
drop policy if exists deadlines_staff_write on public.deadlines;

create or replace function public.deadline_activity_matches_class(
  class_uuid uuid,
  activity_uuid uuid
) returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select activity_uuid is null or exists(
    select 1
    from public.activities activity
    join public.lessons lesson on lesson.id=activity.lesson_id
    join public.topics topic on topic.id=lesson.topic_id
    join public.class_units class_unit
      on class_unit.class_id=class_uuid
      and class_unit.unit_id=topic.unit_id
      and class_unit.active
      and class_unit.archived_at is null
    where activity.id=activity_uuid
      and activity.archived_at is null
  )
$$;

revoke all on function public.deadline_activity_matches_class(uuid,uuid) from public,anon;
grant execute on function public.deadline_activity_matches_class(uuid,uuid) to authenticated;

create or replace function public.can_read_deadline_class(
  class_uuid uuid,
  deadline_organisation_uuid uuid
) returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1
    from public.user_profiles actor
    join public.classes class on class.id=class_uuid
    where actor.id=auth.uid()
      and actor.archived_at is null
      and actor.organisation_id=deadline_organisation_uuid
      and class.organisation_id=actor.organisation_id
      and (
        actor.role='administrator'
        or (class.archived_at is null and public.can_access_class(class.id))
      )
  )
$$;

revoke all on function public.can_read_deadline_class(uuid,uuid) from public,anon;
grant execute on function public.can_read_deadline_class(uuid,uuid) to authenticated;

create policy deadlines_scoped_read
on public.deadlines
for select
to authenticated
using (
  organisation_id=(select organisation_id from public.current_profile())
  and (
    class_id is null
    or public.can_read_deadline_class(class_id,organisation_id)
  )
);

create policy deadlines_scoped_create
on public.deadlines
for insert
to authenticated
with check (
  organisation_id=(select organisation_id from public.current_profile())
  and created_by=auth.uid()
  and (
    (
      (select role from public.current_profile())='administrator'
      and (class_id is null or public.can_manage_class(class_id))
    )
    or (
      (select role from public.current_profile())='teacher'
      and class_id is not null
      and public.can_manage_class(class_id)
    )
  )
  and public.deadline_activity_matches_class(class_id,activity_id)
);

grant select,insert on public.deadlines to authenticated;

comment on table public.deadlines is
  'Dated organisation or class events. Class dates are visible only through an active class relationship and can be created only by the owning teacher, active co-teacher or same-organisation administrator.';
