-- Accept ten-answer starting points; retain first-answer and ownership guards.
create or replace function public.check_mini_study(learner_uuid uuid,session_uuid uuid,grade_value jsonb,target_value text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare session_row public.mini_study_sessions;
begin
 select * into session_row from public.mini_study_sessions where id=session_uuid and learner_id=learner_uuid for update;
 if session_row.id is null or session_row.status='abandoned' or not public.mini_study_assigned(learner_uuid,session_row.class_id,session_row.unit_id) then raise exception 'unit_not_assigned' using errcode='42501'; end if;
 -- First answers are immutable. Refresh/retry cannot turn a first-attempt error into a perfect score.
 if session_row.grade is not null then return session_row.grade; end if;
 if jsonb_typeof(grade_value->'feedback')<>'array' or (grade_value->>'total')::int not between 1 and 10
   or (grade_value->>'correct')::int not between 0 and (grade_value->>'total')::int then raise exception 'invalid_grade'; end if;
 update public.mini_study_sessions set grade=grade_value,status='review',checked_at=now(),target_text=target_value,
   needs_help=((grade_value->>'correct')::numeric/(grade_value->>'total')::numeric<0.5)
 where id=session_uuid;
 return grade_value;
end $$;
revoke all on function public.check_mini_study(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.check_mini_study(uuid,uuid,jsonb,text) to service_role;

