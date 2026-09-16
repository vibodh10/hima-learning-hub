-- Allow short-study starting points for every active unit assigned to a learner's group.
-- Existing completed evidence is preserved; the one open/review step rule remains global per learner.

create or replace function public.mini_study_assigned(learner_uuid uuid,class_uuid uuid,unit_uuid uuid)
returns boolean language sql stable security definer set search_path='' as $$
select exists(
 select 1
 from public.enrolments e
 join public.classes c on c.id=e.class_id
 join public.class_units cu on cu.class_id=c.id
 join public.units u on u.id=cu.unit_id and u.course_id=c.course_id
 join public.user_profiles p on p.id=e.student_id and p.organisation_id=c.organisation_id
 where e.student_id=learner_uuid and e.class_id=class_uuid and cu.unit_id=unit_uuid
 and e.archived_at is null and c.archived_at is null and c.published
 and cu.active and cu.archived_at is null and u.archived_at is null and u.status='approved'
 and p.archived_at is null and p.role='student'
)
$$;
revoke all on function public.mini_study_assigned(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.mini_study_assigned(uuid,uuid,uuid) to service_role;

drop index if exists public.mini_study_one_prerequisite;
create unique index mini_study_one_prerequisite
 on public.mini_study_sessions(learner_id,unit_id)
 where lesson_id='it-prerequisites-10-v1' and status<>'abandoned';

create or replace function public.open_mini_study(learner_uuid uuid,class_uuid uuid,unit_uuid uuid,lesson_value text,kind_value text,content_value jsonb,keys_value jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare current_session public.mini_study_sessions; new_id uuid; baseline_exists boolean;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('mini:'||learner_uuid::text,0));
 if not public.mini_study_assigned(learner_uuid,class_uuid,unit_uuid) then raise exception 'unit_not_assigned' using errcode='42501'; end if;

 -- A changed teacher assignment invalidates an unfinished old-unit step, not its historical evidence.
 update public.mini_study_sessions set status='abandoned'
 where learner_id=learner_uuid and status in ('opened','review') and not public.mini_study_assigned(learner_uuid,class_id,unit_id);

 if lesson_value='it-prerequisites-10-v1' then
  update public.mini_study_sessions set paused_for_starting_point=true
   where learner_id=learner_uuid and status in ('opened','review')
     and not (unit_id=unit_uuid and lesson_id=lesson_value);
 else
  if not exists(
    select 1 from public.mini_study_sessions
    where learner_id=learner_uuid and unit_id=unit_uuid
      and lesson_id='it-prerequisites-10-v1' and status='completed'
  ) then raise exception 'starting_point_required'; end if;
  update public.mini_study_sessions set paused_for_starting_point=false
   where learner_id=learner_uuid and status in ('opened','review') and paused_for_starting_point;
 end if;

 select * into current_session from public.mini_study_sessions
 where learner_id=learner_uuid and status in ('opened','review') and not paused_for_starting_point;
 if current_session.id is not null then return current_session.id; end if;

 select exists(select 1 from public.unit_starting_point_baselines where learner_id=learner_uuid and unit_id=unit_uuid)
   or exists(select 1 from public.mini_study_sessions where learner_id=learner_uuid and unit_id=unit_uuid and kind='baseline' and status='completed')
 into baseline_exists;

 if kind_value='daily' and not baseline_exists and not exists(
   select 1 from public.mini_study_sessions
   where learner_id=learner_uuid and unit_id=unit_uuid
     and lesson_id='it-prerequisites-10-v1' and status='completed'
 ) then raise exception 'starting_point_required'; end if;

 if kind_value='baseline' and (
   (lesson_value='it-prerequisites-10-v1' and exists(
     select 1 from public.mini_study_sessions
     where learner_id=learner_uuid and unit_id=unit_uuid
       and lesson_id=lesson_value and status='completed'
   ))
   or (lesson_value<>'it-prerequisites-10-v1' and baseline_exists)
 ) then raise exception 'starting_point_already_recorded'; end if;

 insert into public.mini_study_sessions(learner_id,class_id,unit_id,unit_code,lesson_id,kind,content,question_keys)
 select learner_uuid,class_uuid,unit_uuid,u.code,lesson_value,kind_value,content_value,keys_value
 from public.units u where u.id=unit_uuid returning id into new_id;
 return new_id;
end $$;
revoke all on function public.open_mini_study(uuid,uuid,uuid,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.open_mini_study(uuid,uuid,uuid,text,text,jsonb,jsonb) to service_role;
