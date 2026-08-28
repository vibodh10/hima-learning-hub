-- Keep a learner's last opened database-driven activity as navigation state.
-- This is deliberately separate from immutable attempts and academic evidence:
-- opening a page must never manufacture a result or completion claim.
create table public.learner_activity_positions (
  learner_id uuid primary key references public.user_profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id),
  activity_id uuid not null references public.activities(id),
  last_opened_at timestamptz not null default now()
);

comment on table public.learner_activity_positions is
  'Last database-driven activity explicitly opened by a learner; navigation state only, never academic evidence.';

alter table public.learner_activity_positions enable row level security;

create policy learner_activity_positions_read on public.learner_activity_positions
for select using (public.can_access_learner(learner_id));

revoke all on public.learner_activity_positions from public,anon,authenticated;
grant select on public.learner_activity_positions to authenticated;

create or replace function public.record_learner_activity_position(
  lesson_uuid uuid,
  activity_uuid uuid
) returns void
language plpgsql security definer set search_path=''
as $$
declare
  actor public.user_profiles;
  selected_unit uuid;
begin
  actor:=public.current_profile();
  if actor.id is null or actor.role<>'student' then
    raise exception 'student_access_required' using errcode='42501';
  end if;

  select topic.unit_id into selected_unit
  from public.activities activity
  join public.lessons lesson on lesson.id=activity.lesson_id
  join public.topics topic on topic.id=lesson.topic_id
  where activity.id=activity_uuid
    and activity.lesson_id=lesson_uuid
    and activity.status='approved' and activity.archived_at is null
    and (activity.release_at is null or activity.release_at<=now())
    and lesson.status='approved' and lesson.archived_at is null
    and (lesson.release_at is null or lesson.release_at<=now())
    and public.can_access_unit(topic.unit_id);

  if selected_unit is null then
    raise exception 'activity_not_available' using errcode='42501';
  end if;

  insert into public.learner_activity_positions(
    learner_id,lesson_id,activity_id,last_opened_at
  ) values(actor.id,lesson_uuid,activity_uuid,now())
  on conflict(learner_id) do update set
    lesson_id=excluded.lesson_id,
    activity_id=excluded.activity_id,
    last_opened_at=excluded.last_opened_at;
end;
$$;

revoke all on function public.record_learner_activity_position(uuid,uuid)
  from public,anon;
grant execute on function public.record_learner_activity_position(uuid,uuid)
  to authenticated;
