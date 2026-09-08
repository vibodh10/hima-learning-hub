-- Short formative practice. No personal background, uploads or assignment submissions.
-- Answer snapshots are private: students receive only the current public questions via authenticated server actions.
create table public.mini_study_sessions (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.user_profiles(id),
  class_id uuid not null references public.classes(id),
  unit_id uuid not null references public.units(id),
  unit_code text not null,
  lesson_id text not null,
  kind text not null check(kind in ('baseline','daily')),
  status text not null default 'opened' check(status in ('opened','review','completed','abandoned')),
  content jsonb not null check(jsonb_typeof(content)='object'),
  question_keys jsonb not null check(jsonb_typeof(question_keys)='array' and jsonb_array_length(question_keys) between 1 and 5),
  grade jsonb check(grade is null or jsonb_typeof(grade)='object'),
  target_text text,
  needs_help boolean not null default false,
  opened_at timestamptz not null default now(),
  checked_at timestamptz,
  completed_at timestamptz,
  reward jsonb,
  check((status='completed')=(completed_at is not null)),
  check(status not in ('review','completed') or grade is not null)
);
create unique index mini_study_one_open on public.mini_study_sessions(learner_id) where status in ('opened','review');
create unique index mini_study_one_lesson on public.mini_study_sessions(learner_id,class_id,unit_id,kind,lesson_id) where status<>'abandoned';
create index mini_study_teacher_records on public.mini_study_sessions(class_id,unit_id,learner_id,completed_at desc);
alter table public.mini_study_sessions enable row level security;
revoke all on public.mini_study_sessions from public,anon,authenticated;
grant select on public.mini_study_sessions to authenticated;
grant all on public.mini_study_sessions to service_role;
create policy mini_study_teacher_read on public.mini_study_sessions for select to authenticated
using(public.can_manage_class(class_id));

create function public.mini_study_assigned(learner_uuid uuid,class_uuid uuid,unit_uuid uuid)
returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from public.enrolments e
 join public.classes c on c.id=e.class_id
 join public.class_units cu on cu.class_id=c.id and cu.unit_id=c.active_unit_id
 join public.units u on u.id=cu.unit_id and u.course_id=c.course_id
 join public.user_profiles p on p.id=e.student_id and p.organisation_id=c.organisation_id
 where e.student_id=learner_uuid and e.class_id=class_uuid and cu.unit_id=unit_uuid
 and e.archived_at is null and c.archived_at is null and c.published
 and cu.active and cu.archived_at is null and u.archived_at is null and p.archived_at is null and p.role='student')
$$;
revoke all on function public.mini_study_assigned(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.mini_study_assigned(uuid,uuid,uuid) to service_role;

create function public.open_mini_study(learner_uuid uuid,class_uuid uuid,unit_uuid uuid,lesson_value text,kind_value text,content_value jsonb,keys_value jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare current_session public.mini_study_sessions; new_id uuid; today date:=(now() at time zone 'Europe/London')::date;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('mini:'||learner_uuid::text,0));
 if not public.mini_study_assigned(learner_uuid,class_uuid,unit_uuid) then raise exception 'unit_not_assigned' using errcode='42501'; end if;
 if exists(select 1 from public.mini_study_sessions where learner_id=learner_uuid and status='completed' and (completed_at at time zone 'Europe/London')::date=today) then raise exception 'finished_today'; end if;
 -- A changed teacher assignment invalidates an unfinished old-unit step, not its historical evidence.
 update public.mini_study_sessions set status='abandoned'
 where learner_id=learner_uuid and status in ('opened','review') and not public.mini_study_assigned(learner_uuid,class_id,unit_id);
 select * into current_session from public.mini_study_sessions where learner_id=learner_uuid and status in ('opened','review');
 if current_session.id is not null then return current_session.id; end if;
 insert into public.mini_study_sessions(learner_id,class_id,unit_id,unit_code,lesson_id,kind,content,question_keys)
 select learner_uuid,class_uuid,unit_uuid,u.code,lesson_value,kind_value,content_value,keys_value from public.units u where u.id=unit_uuid returning id into new_id;
 return new_id;
end $$;
revoke all on function public.open_mini_study(uuid,uuid,uuid,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.open_mini_study(uuid,uuid,uuid,text,text,jsonb,jsonb) to service_role;

create function public.check_mini_study(learner_uuid uuid,session_uuid uuid,grade_value jsonb,target_value text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare session_row public.mini_study_sessions;
begin
 select * into session_row from public.mini_study_sessions where id=session_uuid and learner_id=learner_uuid for update;
 if session_row.id is null or session_row.status='abandoned' or not public.mini_study_assigned(learner_uuid,session_row.class_id,session_row.unit_id) then raise exception 'unit_not_assigned' using errcode='42501'; end if;
 -- First answers are immutable. Refresh/retry cannot turn a first-attempt error into a perfect score.
 if session_row.grade is not null then return session_row.grade; end if;
 if jsonb_typeof(grade_value->'feedback')<>'array' or (grade_value->>'total')::int not between 1 and 4
   or (grade_value->>'correct')::int not between 0 and (grade_value->>'total')::int then raise exception 'invalid_grade'; end if;
 update public.mini_study_sessions set grade=grade_value,status='review',checked_at=now(),target_text=target_value,
   needs_help=((grade_value->>'correct')::numeric/(grade_value->>'total')::numeric<0.5)
 where id=session_uuid;
 return grade_value;
end $$;
revoke all on function public.check_mini_study(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.check_mini_study(uuid,uuid,jsonb,text) to service_role;

create function public.finish_mini_study(learner_uuid uuid,session_uuid uuid)
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
 if exists(select 1 from public.mini_study_sessions where learner_id=learner_uuid and status='completed' and (completed_at at time zone 'Europe/London')::date=today) then raise exception 'finished_today'; end if;
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
revoke all on function public.finish_mini_study(uuid,uuid) from public,anon,authenticated;
grant execute on function public.finish_mini_study(uuid,uuid) to service_role;
