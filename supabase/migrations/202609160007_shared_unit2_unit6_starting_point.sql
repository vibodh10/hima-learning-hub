-- Unit 2 + Unit 6 groups use one shared ten-question starting point.
-- This keeps a future full migration push consistent with the application while
-- preserving per-unit starting points for every other group combination.
create or replace function public.open_mini_study(learner_uuid uuid,class_uuid uuid,unit_uuid uuid,lesson_value text,kind_value text,content_value jsonb,keys_value jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare
 current_session public.mini_study_sessions;
 paused_session public.mini_study_sessions;
 new_id uuid;
 baseline_exists boolean;
 shared_starting_point_exists boolean;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('mini:'||learner_uuid::text,0));
 if not public.mini_study_assigned(learner_uuid,class_uuid,unit_uuid) then raise exception 'unit_not_assigned' using errcode='42501'; end if;

 update public.mini_study_sessions set status='abandoned'
 where learner_id=learner_uuid and status in ('opened','review')
   and not public.mini_study_assigned(learner_uuid,class_id,unit_id);

 select * into current_session from public.mini_study_sessions
 where learner_id=learner_uuid and status in ('opened','review') and not paused_for_starting_point
 order by opened_at limit 1;
 if current_session.id is not null then return current_session.id; end if;

 select exists(select 1 from public.unit_starting_point_baselines where learner_id=learner_uuid and unit_id=unit_uuid)
   or exists(select 1 from public.mini_study_sessions where learner_id=learner_uuid and unit_id=unit_uuid and kind='baseline' and status='completed')
 into baseline_exists;

 select exists(
   select 1
   from public.mini_study_sessions ms
   where ms.learner_id=learner_uuid and ms.class_id=class_uuid
     and ms.lesson_id='it-prerequisites-10-v1' and ms.status='completed'
     and exists(
       select 1 from public.class_units cu join public.units u on u.id=cu.unit_id
       where cu.class_id=class_uuid and cu.active and cu.archived_at is null and u.archived_at is null and u.code='2'
     )
     and exists(
       select 1 from public.class_units cu join public.units u on u.id=cu.unit_id
       where cu.class_id=class_uuid and cu.active and cu.archived_at is null and u.archived_at is null and u.code='6'
     )
 ) into shared_starting_point_exists;

 if lesson_value='it-prerequisites-10-v1' then
   if shared_starting_point_exists or exists(
     select 1 from public.mini_study_sessions
     where learner_id=learner_uuid and unit_id=unit_uuid
       and lesson_id=lesson_value and status='completed'
   ) then raise exception 'starting_point_already_recorded'; end if;
 else
   if not baseline_exists and not shared_starting_point_exists and not exists(
     select 1 from public.mini_study_sessions
     where learner_id=learner_uuid and unit_id=unit_uuid
       and lesson_id='it-prerequisites-10-v1' and status='completed'
   ) then raise exception 'starting_point_required'; end if;

   select * into paused_session from public.mini_study_sessions
   where learner_id=learner_uuid and class_id=class_uuid and unit_id=unit_uuid
     and status in ('opened','review') and paused_for_starting_point
   order by opened_at limit 1;
   if paused_session.id is not null then
     update public.mini_study_sessions set paused_for_starting_point=false where id=paused_session.id;
     return paused_session.id;
   end if;
 end if;

 if kind_value='baseline' and lesson_value<>'it-prerequisites-10-v1' and baseline_exists then
   raise exception 'starting_point_already_recorded';
 end if;

 insert into public.mini_study_sessions(learner_id,class_id,unit_id,unit_code,lesson_id,kind,content,question_keys)
 select learner_uuid,class_uuid,unit_uuid,u.code,lesson_value,kind_value,content_value,keys_value
 from public.units u where u.id=unit_uuid returning id into new_id;
 return new_id;
end $$;
revoke all on function public.open_mini_study(uuid,uuid,uuid,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.open_mini_study(uuid,uuid,uuid,text,text,jsonb,jsonb) to service_role;
