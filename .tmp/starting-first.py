from pathlib import Path
p=Path('src/lib/mini-study-server.ts');s=p.read_text();needle='  if(active) return {status:"active",card:cardForSession(active),grade:active.grade};';s=s.replace(needle,'  const needsStartingPoint=!sessions.some(s=>s.lesson_id===startingPointId&&s.status==="completed");\n  if(needsStartingPoint&&active?.lesson_id!==startingPointId)return {status:"ready",unitTitle:context.unitTitle,kind:"baseline"};\n'+needle);p.write_text(s)
s=Path('supabase/migrations/202609160002_ten_question_starting_point.sql').read_text();s=s[s.index('create or replace function'):]
s=s.replace(" select * into current_session from public.mini_study_sessions where learner_id=learner_uuid and status in ('opened','review');", """ if lesson_value='it-prerequisites-10-v1' then
  update public.mini_study_sessions set paused_for_starting_point=true
   where learner_id=learner_uuid and status in ('opened','review') and lesson_id<>lesson_value;
 else
  if not exists(select 1 from public.mini_study_sessions where learner_id=learner_uuid and lesson_id='it-prerequisites-10-v1' and status='completed') then raise exception 'starting_point_required'; end if;
  update public.mini_study_sessions set paused_for_starting_point=false
   where learner_id=learner_uuid and status in ('opened','review') and paused_for_starting_point;
 end if;
 select * into current_session from public.mini_study_sessions where learner_id=learner_uuid and status in ('opened','review') and not paused_for_starting_point;""")
header='''-- Preserve in-progress and completed work while making the new instrument first.
alter table public.mini_study_sessions add column paused_for_starting_point boolean not null default false;
alter table public.mini_study_sessions drop constraint mini_study_sessions_question_keys_check;
alter table public.mini_study_sessions add constraint mini_study_sessions_question_keys_check check(jsonb_typeof(question_keys)='array' and jsonb_array_length(question_keys) between 1 and 10);
drop index public.mini_study_one_open;
create unique index mini_study_one_open on public.mini_study_sessions(learner_id) where status in ('opened','review') and not paused_for_starting_point;
drop index public.mini_study_one_baseline;
create unique index mini_study_one_baseline on public.mini_study_sessions(learner_id,unit_id) where kind='baseline' and status<>'abandoned' and lesson_id<>'it-prerequisites-10-v1';
create unique index mini_study_one_prerequisite on public.mini_study_sessions(learner_id) where lesson_id='it-prerequisites-10-v1' and status<>'abandoned';
'''
Path('supabase/migrations/202609160003_starting_point_first.sql').write_text(header+s)
