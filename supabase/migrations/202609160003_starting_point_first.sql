-- Preserve in-progress and completed work while making the new instrument first.
alter table public.mini_study_sessions add column paused_for_starting_point boolean not null default false;
alter table public.mini_study_sessions drop constraint mini_study_sessions_question_keys_check;
alter table public.mini_study_sessions add constraint mini_study_sessions_question_keys_check check(jsonb_typeof(question_keys)='array' and jsonb_array_length(question_keys) between 1 and 10);
drop index public.mini_study_one_open;
create unique index mini_study_one_open on public.mini_study_sessions(learner_id) where status in ('opened','review') and not paused_for_starting_point;
drop index public.mini_study_one_baseline;
create unique index mini_study_one_baseline on public.mini_study_sessions(learner_id,unit_id) where kind='baseline' and status<>'abandoned' and lesson_id<>'it-prerequisites-10-v1';
create unique index mini_study_one_prerequisite on public.mini_study_sessions(learner_id) where lesson_id='it-prerequisites-10-v1' and status<>'abandoned';
create or replace function public.open_mini_study(learner_uuid uuid,class_uuid uuid,unit_uuid uuid,lesson_value text,kind_value text,content_value jsonb,keys_value jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare current_session public.mini_study_sessions; new_id uuid; baseline_exists boolean; today date:=(now() at time zone 'Europe/London')::date;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('mini:'||learner_uuid::text,0));
 if not public.mini_study_assigned(learner_uuid,class_uuid,unit_uuid) then raise exception 'unit_not_assigned' using errcode='42501'; end if;
 -- A changed teacher assignment invalidates an unfinished old-unit step, not its historical evidence.
 update public.mini_study_sessions set status='abandoned'
 where learner_id=learner_uuid and status in ('opened','review') and not public.mini_study_assigned(learner_uuid,class_id,unit_id);
 if lesson_value='it-prerequisites-10-v1' then
  update public.mini_study_sessions set paused_for_starting_point=true
   where learner_id=learner_uuid and status in ('opened','review') and lesson_id<>lesson_value;
 else
  if not exists(select 1 from public.mini_study_sessions where learner_id=learner_uuid and lesson_id='it-prerequisites-10-v1' and status='completed') then raise exception 'starting_point_required'; end if;
  update public.mini_study_sessions set paused_for_starting_point=false
   where learner_id=learner_uuid and status in ('opened','review') and paused_for_starting_point;
 end if;
 select * into current_session from public.mini_study_sessions where learner_id=learner_uuid and status in ('opened','review') and not paused_for_starting_point;
 if current_session.id is not null then return current_session.id; end if;
 select exists(select 1 from public.unit_starting_point_baselines where learner_id=learner_uuid and unit_id=unit_uuid)
   or exists(select 1 from public.mini_study_sessions where learner_id=learner_uuid and unit_id=unit_uuid and kind='baseline' and status='completed')
 into baseline_exists;
 if kind_value='daily' and not baseline_exists and not exists(select 1 from public.mini_study_sessions where learner_id=learner_uuid and lesson_id='it-prerequisites-10-v1' and status='completed') then raise exception 'starting_point_required'; end if;
 if kind_value='baseline' and ((lesson_value='it-prerequisites-10-v1' and exists(select 1 from public.mini_study_sessions where learner_id=learner_uuid and lesson_id=lesson_value and status='completed')) or (lesson_value<>'it-prerequisites-10-v1' and baseline_exists)) then raise exception 'starting_point_already_recorded'; end if;
 insert into public.mini_study_sessions(learner_id,class_id,unit_id,unit_code,lesson_id,kind,content,question_keys)
 select learner_uuid,class_uuid,unit_uuid,u.code,lesson_value,kind_value,content_value,keys_value from public.units u where u.id=unit_uuid returning id into new_id;
 return new_id;
end $$;
