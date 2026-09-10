-- Optional extra lessons: keep assignment, first-answer and per-session reward guards.
-- Only the one-completion-per-day restriction is removed. Existing records are unchanged.
create or replace function public.open_mini_study(learner_uuid uuid,class_uuid uuid,unit_uuid uuid,lesson_value text,kind_value text,content_value jsonb,keys_value jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare current_session public.mini_study_sessions; new_id uuid; baseline_exists boolean; today date:=(now() at time zone 'Europe/London')::date;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('mini:'||learner_uuid::text,0));
 if not public.mini_study_assigned(learner_uuid,class_uuid,unit_uuid) then raise exception 'unit_not_assigned' using errcode='42501'; end if;
 -- A changed teacher assignment invalidates an unfinished old-unit step, not its historical evidence.
 update public.mini_study_sessions set status='abandoned'
 where learner_id=learner_uuid and status in ('opened','review') and not public.mini_study_assigned(learner_uuid,class_id,unit_id);
 select * into current_session from public.mini_study_sessions where learner_id=learner_uuid and status in ('opened','review');
 if current_session.id is not null then return current_session.id; end if;
 select exists(select 1 from public.unit_starting_point_baselines where learner_id=learner_uuid and unit_id=unit_uuid)
   or exists(select 1 from public.mini_study_sessions where learner_id=learner_uuid and unit_id=unit_uuid and kind='baseline' and status='completed')
 into baseline_exists;
 if kind_value='daily' and not baseline_exists then raise exception 'starting_point_required'; end if;
 if kind_value='baseline' and baseline_exists then raise exception 'starting_point_already_recorded'; end if;
 insert into public.mini_study_sessions(learner_id,class_id,unit_id,unit_code,lesson_id,kind,content,question_keys)
 select learner_uuid,class_uuid,unit_uuid,u.code,lesson_value,kind_value,content_value,keys_value from public.units u where u.id=unit_uuid returning id into new_id;
 return new_id;
end $$;
create or replace function public.finish_mini_study(learner_uuid uuid,session_uuid uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare session_row public.mini_study_sessions; organisation_uuid uuid; rule_row public.achievement_point_rules;
 badge_uuid uuid; badge_title text; daily_count integer; points_value integer:=0; result jsonb;
 today date:=(now() at time zone 'Europe/London')::date;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('mini:'||learner_uuid::text,0));
 select * into session_row from public.mini_study_sessions where id=session_uuid and learner_id=learner_uuid for update;
 if session_row.id is null or not public.mini_study_assigned(learner_uuid,session_row.class_id,session_row.unit_id) then raise exception 'unit_not_assigned' using errcode='42501'; end if;
 if session_row.status='completed' then return session_row.reward; end if;
 if session_row.status<>'review' then raise exception 'check_answers_first'; end if;
 select organisation_id into organisation_uuid from public.user_profiles where id=learner_uuid;
 insert into public.achievement_point_rules(organisation_id,code,title,points,conditions)
 values(organisation_uuid,'mini_study_complete','Short self-study completed',20,'{"source":"mini_study","requires_feedback_review":true}') on conflict(organisation_id,code) do nothing;
 select * into rule_row from public.achievement_point_rules where organisation_id=organisation_uuid and code='mini_study_complete';
 if rule_row.enabled and rule_row.points>0 then
   points_value:=rule_row.points;
   insert into public.learner_achievement_point_events(learner_id,rule_id,points,source_type,source_id,idempotency_key,description,evidence)
   values(learner_uuid,rule_row.id,points_value,'progress',session_uuid,'mini:'||session_uuid::text,'Completed a short self-study step and reviewed feedback.',jsonb_build_object('class_id',session_row.class_id,'unit_id',session_row.unit_id,'kind',session_row.kind)) on conflict(learner_id,idempotency_key) do nothing;
 end if;
 select count(*) into daily_count from public.mini_study_sessions where learner_id=learner_uuid and kind='daily' and status='completed';
 if session_row.kind='daily' then daily_count:=daily_count+1; end if;
 if session_row.kind='daily' and daily_count in (1,5,10) then
   badge_title:=case daily_count when 1 then 'First small step' when 5 then 'Five small steps' else 'Ten small steps' end;
   insert into public.badge_definitions(organisation_id,code,title,description,icon,criteria)
   values(organisation_uuid,'mini_steps_'||daily_count::text,badge_title,'Completed short self-study steps and reviewed feedback.','star',jsonb_build_object('mini_study_completions',daily_count)) on conflict(organisation_id,code) do nothing;
   select id into badge_uuid from public.badge_definitions where organisation_id=organisation_uuid and code='mini_steps_'||daily_count::text and enabled and archived_at is null;
   if badge_uuid is not null then
     insert into public.badge_awards(learner_id,badge_id,reason,evidence) values(learner_uuid,badge_uuid,badge_title,jsonb_build_object('mini_study_session',session_uuid,'completed_steps',daily_count)) on conflict(learner_id,badge_id) do nothing;
   else badge_title:=null; end if;
 end if;
 result:=jsonb_build_object('xp',points_value,'badge',badge_title,'nextOn',today+1);
 update public.mini_study_sessions set status='completed',completed_at=now(),reward=result where id=session_uuid;
 return result;
end $$;
