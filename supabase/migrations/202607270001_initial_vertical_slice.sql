-- Hima Learning Hub: first vertical slice. PostgreSQL / Supabase.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('student','teacher','administrator');
create type public.pathway as enum ('Support','Core','Stretch','Mastery');
create type public.activity_kind as enum ('in_class_learning','in_class_practice','homework','revision','holiday_work','skills_practice','review_check');
create type public.question_kind as enum ('single_choice','multiple_response','true_false','matching','ordering','fill_blank','short_text','numeric','code_output','pseudocode_ordering','code_completion','scenario','extended_response','confidence','reflection');
create type public.target_status as enum ('proposed','active','achieved','partially_achieved','not_achieved','replaced','archived');

create table public.organisations (
  id uuid primary key default gen_random_uuid(), name text not null,
  archived_at timestamptz, created_at timestamptz not null default now()
);
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  organisation_id uuid not null references public.organisations(id),
  role public.app_role not null, display_name text not null,
  archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.academic_years (
  id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id),
  name text not null, starts_on date not null, ends_on date not null, archived_at timestamptz,
  unique (organisation_id, name), check (ends_on > starts_on)
);
create table public.courses (
  id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id),
  title text not null, qualification text not null, archived_at timestamptz
);
create table public.units (
  id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id),
  code text not null, title text not null, sort_order integer not null default 0, archived_at timestamptz,
  unique(course_id, code)
);
create table public.topics (
  id uuid primary key default gen_random_uuid(), unit_id uuid not null references public.units(id),
  title text not null, sort_order integer not null default 0, archived_at timestamptz
);
create table public.classes (
  id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id),
  academic_year_id uuid not null references public.academic_years(id), course_id uuid not null references public.courses(id),
  teacher_id uuid not null references public.user_profiles(id), name text not null,
  enrolment_code_hash text not null, enrolment_code_hint text not null, archived_at timestamptz, created_at timestamptz not null default now()
);
create table public.enrolments (
  id uuid primary key default gen_random_uuid(), class_id uuid not null references public.classes(id),
  student_id uuid not null references public.user_profiles(id), enrolled_at timestamptz not null default now(), archived_at timestamptz,
  unique(class_id, student_id)
);
create table public.lessons (
  id uuid primary key default gen_random_uuid(), topic_id uuid not null references public.topics(id),
  week_number integer not null check (week_number > 0), title text not null,
  remember text, learn text not null, worked_example text not null, reflection_prompt text,
  release_at timestamptz, archived_at timestamptz, unique(topic_id, week_number)
);
create table public.activities (
  id uuid primary key default gen_random_uuid(), lesson_id uuid not null references public.lessons(id),
  title text not null, kind public.activity_kind not null, pathway public.pathway not null default 'Core',
  release_at timestamptz, deadline_at timestamptz, estimated_minutes integer not null default 10,
  max_attempts integer not null default 3, required boolean not null default true, automatic_marking boolean not null default true,
  archived_at timestamptz, check (estimated_minutes > 0), check (max_attempts > 0)
);
create table public.questions (
  id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id),
  unit_id uuid not null references public.units(id), topic_id uuid not null references public.topics(id),
  difficulty public.pathway not null, kind public.question_kind not null, question_text text not null,
  correct_answer jsonb not null, acceptable_answers jsonb not null default '[]', explanation text not null,
  marks numeric(6,2) not null default 1, tags text[] not null default '{}', estimated_seconds integer,
  numeric_tolerance numeric, archived_at timestamptz, check (marks >= 0)
);
create table public.question_options (
  id uuid primary key default gen_random_uuid(), question_id uuid not null references public.questions(id),
  option_text text not null, sort_order integer not null, unique(question_id, sort_order)
);
create table public.activity_questions (
  activity_id uuid not null references public.activities(id), question_id uuid not null references public.questions(id),
  sort_order integer not null, primary key(activity_id, question_id), unique(activity_id, sort_order)
);
create table public.attempts (
  id uuid primary key default gen_random_uuid(), learner_id uuid not null references public.user_profiles(id),
  activity_id uuid not null references public.activities(id), attempt_number integer not null,
  started_at timestamptz not null default now(), completed_at timestamptz,
  mark numeric(8,2), max_mark numeric(8,2), percentage numeric(5,2), hints_used integer not null default 0,
  feedback_shown boolean not null default false, pathway public.pathway not null,
  teacher_override_by uuid references public.user_profiles(id), teacher_override_reason text,
  created_at timestamptz not null default now(), unique(learner_id, activity_id, attempt_number),
  check (attempt_number > 0), check (hints_used >= 0), check (percentage between 0 and 100)
);
create table public.attempt_answers (
  id uuid primary key default gen_random_uuid(), attempt_id uuid not null references public.attempts(id),
  question_id uuid not null references public.questions(id), answer jsonb not null,
  mark numeric(6,2) not null, max_mark numeric(6,2) not null, is_correct boolean not null,
  feedback text, hints_used integer not null default 0, answered_at timestamptz not null default now(),
  teacher_override_by uuid references public.user_profiles(id), unique(attempt_id, question_id)
);
create table public.topic_progress (
  learner_id uuid not null references public.user_profiles(id), topic_id uuid not null references public.topics(id),
  first_score numeric(5,2) not null, latest_score numeric(5,2) not null, best_score numeric(5,2) not null,
  average_score numeric(5,2) not null, attempt_count integer not null, completion_rate numeric(5,2) not null default 0,
  current_pathway public.pathway not null, updated_at timestamptz not null default now(),
  primary key(learner_id, topic_id)
);
create table public.targets (
  id uuid primary key default gen_random_uuid(), learner_id uuid not null references public.user_profiles(id),
  topic_id uuid not null references public.topics(id), target_text text not null, reason text not null,
  target_date date not null, status public.target_status not null default 'proposed', evidence jsonb not null default '{}',
  review_result text, approved_by uuid references public.user_profiles(id), approved_at timestamptz,
  teacher_note text, created_at timestamptz not null default now(), archived_at timestamptz
);
create table public.deadlines (
  id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id),
  class_id uuid references public.classes(id), title text not null, kind text not null,
  occurs_at timestamptz not null, activity_id uuid references public.activities(id), created_by uuid not null references public.user_profiles(id)
);
create table public.reminders (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.user_profiles(id),
  deadline_id uuid references public.deadlines(id), message text not null, remind_at timestamptz not null, dismissed_at timestamptz
);
create table public.interventions (
  id uuid primary key default gen_random_uuid(), learner_id uuid not null references public.user_profiles(id),
  class_id uuid not null references public.classes(id), kind text not null, status text not null default 'open',
  evidence jsonb not null default '{}', note text, created_by uuid references public.user_profiles(id),
  created_at timestamptz not null default now(), resolved_at timestamptz
);
create table public.teacher_notes (
  id uuid primary key default gen_random_uuid(), learner_id uuid not null references public.user_profiles(id),
  teacher_id uuid not null references public.user_profiles(id), note text not null,
  created_at timestamptz not null default now(), archived_at timestamptz
);
create table public.achievements (
  id uuid primary key default gen_random_uuid(), learner_id uuid not null references public.user_profiles(id),
  code text not null, title text not null, earned_at timestamptz not null default now(), unique(learner_id, code)
);
create table public.audit_logs (
  id bigint generated always as identity primary key, organisation_id uuid not null references public.organisations(id),
  actor_id uuid references public.user_profiles(id), action text not null, entity_type text not null,
  entity_id uuid, before_data jsonb, after_data jsonb, occurred_at timestamptz not null default now()
);

create index attempts_learner_activity_idx on public.attempts(learner_id, activity_id, completed_at desc);
create index attempts_activity_idx on public.attempts(activity_id, completed_at desc);
create index enrolments_student_idx on public.enrolments(student_id) where archived_at is null;
create index classes_teacher_idx on public.classes(teacher_id) where archived_at is null;
create index questions_topic_idx on public.questions(topic_id) where archived_at is null;
create index targets_learner_status_idx on public.targets(learner_id, status) where archived_at is null;

create function public.current_profile() returns public.user_profiles language sql stable security definer set search_path = '' as
$$ select * from public.user_profiles where id = auth.uid() and archived_at is null $$;
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as
$$ select exists(select 1 from public.user_profiles p where p.id=auth.uid() and p.role='administrator' and p.archived_at is null) $$;
create function public.can_access_class(class_uuid uuid) returns boolean language sql stable security definer set search_path = '' as
$$ select exists(
  select 1 from public.classes c join public.user_profiles p on p.id=auth.uid()
  where c.id=class_uuid and c.organisation_id=p.organisation_id and c.archived_at is null
  and (p.role='administrator' or c.teacher_id=p.id or exists(
    select 1 from public.enrolments e where e.class_id=c.id and e.student_id=p.id and e.archived_at is null))
) $$;
create function public.can_access_learner(learner_uuid uuid) returns boolean language sql stable security definer set search_path = '' as
$$ select auth.uid()=learner_uuid or public.is_admin() or exists(
  select 1 from public.enrolments e join public.classes c on c.id=e.class_id
  where e.student_id=learner_uuid and e.archived_at is null and c.teacher_id=auth.uid() and c.archived_at is null
) $$;

alter table public.user_profiles enable row level security;
alter table public.classes enable row level security;
alter table public.enrolments enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.topic_progress enable row level security;
alter table public.targets enable row level security;
alter table public.teacher_notes enable row level security;
alter table public.interventions enable row level security;
alter table public.achievements enable row level security;
alter table public.organisations enable row level security;
alter table public.deadlines enable row level security;
alter table public.reminders enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select_authorised on public.user_profiles for select using (public.can_access_learner(id));
create policy classes_select_member on public.classes for select using (public.can_access_class(id));
create policy classes_teacher_create on public.classes for insert with check (
  teacher_id=auth.uid() and organisation_id=(select organisation_id from public.current_profile()) and
  (select role from public.current_profile()) in ('teacher','administrator')
);
create policy enrolments_select_member on public.enrolments for select using (public.can_access_class(class_id));
create policy attempts_select_authorised on public.attempts for select using (public.can_access_learner(learner_id));
create policy attempts_student_insert on public.attempts for insert with check (learner_id=auth.uid());
create policy answers_select_authorised on public.attempt_answers for select using (
  exists(select 1 from public.attempts a where a.id=attempt_id and public.can_access_learner(a.learner_id))
);
create policy answers_student_insert on public.attempt_answers for insert with check (
  exists(select 1 from public.attempts a where a.id=attempt_id and a.learner_id=auth.uid())
);
create policy progress_select_authorised on public.topic_progress for select using (public.can_access_learner(learner_id));
create policy targets_select_authorised on public.targets for select using (public.can_access_learner(learner_id));
create policy notes_select_teacher on public.teacher_notes for select using (
  teacher_id=auth.uid() or public.is_admin()
);
create policy interventions_select_teacher on public.interventions for select using (public.can_access_class(class_id));
create policy achievements_select_authorised on public.achievements for select using (public.can_access_learner(learner_id));
create policy organisations_member_read on public.organisations for select using (
  id=(select organisation_id from public.current_profile())
);
create policy deadlines_org_read on public.deadlines for select using (
  organisation_id=(select organisation_id from public.current_profile())
);
create policy deadlines_staff_write on public.deadlines for insert with check (
  organisation_id=(select organisation_id from public.current_profile())
  and (select role from public.current_profile()) in ('teacher','administrator')
);
create policy reminders_own_read on public.reminders for select using (user_id=auth.uid());
create policy reminders_own_update on public.reminders for update using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy audit_logs_admin_read on public.audit_logs for select using (
  organisation_id=(select organisation_id from public.current_profile()) and public.is_admin()
);

-- Public curriculum is readable only to authenticated organisation members.
alter table public.academic_years enable row level security;
alter table public.courses enable row level security;
alter table public.units enable row level security;
alter table public.topics enable row level security;
alter table public.lessons enable row level security;
alter table public.activities enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.activity_questions enable row level security;
create policy academic_years_org_read on public.academic_years for select using (organisation_id=(select organisation_id from public.current_profile()));
create policy courses_org_read on public.courses for select using (organisation_id=(select organisation_id from public.current_profile()));
create policy units_read on public.units for select using (exists(select 1 from public.courses c where c.id=course_id and c.organisation_id=(select organisation_id from public.current_profile())));
create policy topics_read on public.topics for select using (exists(select 1 from public.units u join public.courses c on c.id=u.course_id where u.id=unit_id and c.organisation_id=(select organisation_id from public.current_profile())));
create policy lessons_read on public.lessons for select using (auth.uid() is not null and (release_at is null or release_at<=now()));
create policy activities_read on public.activities for select using (auth.uid() is not null and archived_at is null and (release_at is null or release_at<=now()));
create policy questions_read on public.questions for select using (auth.uid() is not null and archived_at is null);
create policy options_read on public.question_options for select using (auth.uid() is not null);
create policy activity_questions_read on public.activity_questions for select using (auth.uid() is not null);

-- Correct answers must not be granted directly to browser roles in production.
-- Remove any table-level default grant first, then allow-list display metadata.
-- Submission is performed through the submit_activity security-definer RPC below.
revoke all on public.questions from anon, authenticated;
grant select (
  id,course_id,unit_id,topic_id,difficulty,kind,question_text,explanation,
  marks,tags,estimated_seconds,archived_at
) on public.questions to authenticated;

create function public.pathway_for(score numeric, hint_count integer default 0) returns public.pathway
language sql immutable as $$
  select case
    when greatest(0,score-least(hint_count*3,15)) < 50 then 'Support'::public.pathway
    when greatest(0,score-least(hint_count*3,15)) < 70 then 'Core'::public.pathway
    when greatest(0,score-least(hint_count*3,15)) < 85 then 'Stretch'::public.pathway
    else 'Mastery'::public.pathway end
$$;

comment on table public.attempts is 'Immutable learner attempt header; corrections are explicit teacher overrides.';
comment on table public.attempt_answers is 'Immutable submitted answers. Never update historical learner answers.';

-- Mutations exposed to authenticated clients. Each function re-authorises the
-- caller and fixes its search path before touching data.
create function public.create_class(
  class_name text, course_uuid uuid, academic_year_uuid uuid, enrolment_code text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  actor public.user_profiles;
  created_id uuid;
begin
  select * into actor from public.user_profiles
    where id=auth.uid() and role in ('teacher','administrator') and archived_at is null;
  if actor.id is null then raise exception 'not_authorised' using errcode='42501'; end if;
  if length(trim(class_name)) < 2 or length(enrolment_code) < 6 then
    raise exception 'invalid_class_details' using errcode='22023';
  end if;
  if not exists(select 1 from public.courses where id=course_uuid and organisation_id=actor.organisation_id and archived_at is null)
    or not exists(select 1 from public.academic_years where id=academic_year_uuid and organisation_id=actor.organisation_id and archived_at is null) then
    raise exception 'invalid_curriculum' using errcode='22023';
  end if;
  insert into public.classes(organisation_id,academic_year_id,course_id,teacher_id,name,enrolment_code_hash,enrolment_code_hint)
  values(actor.organisation_id,academic_year_uuid,course_uuid,actor.id,trim(class_name),
    extensions.crypt(upper(trim(enrolment_code)),extensions.gen_salt('bf')),right(upper(trim(enrolment_code)),2))
  returning id into created_id;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'class.created','class',created_id,jsonb_build_object('name',trim(class_name)));
  return created_id;
end $$;

create function public.join_class(enrolment_code text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  actor public.user_profiles;
  matched_class public.classes;
begin
  select * into actor from public.user_profiles where id=auth.uid() and role='student' and archived_at is null;
  if actor.id is null then raise exception 'not_authorised' using errcode='42501'; end if;
  select * into matched_class from public.classes c
    where c.organisation_id=actor.organisation_id and c.archived_at is null
      and extensions.crypt(upper(trim(enrolment_code)),c.enrolment_code_hash)=c.enrolment_code_hash
    limit 1;
  if matched_class.id is null then raise exception 'invalid_enrolment_code' using errcode='22023'; end if;
  insert into public.enrolments(class_id,student_id) values(matched_class.id,actor.id)
    on conflict(class_id,student_id) do update set archived_at=null;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'enrolment.joined','class',matched_class.id,jsonb_build_object('student_id',actor.id));
  return matched_class.id;
end $$;

create function public.submit_activity(activity_uuid uuid, submitted_answers jsonb, hint_count integer default 0)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  actor public.user_profiles;
  selected_activity public.activities;
  selected_topic uuid;
  answer_row record;
  supplied jsonb;
  accepted text[];
  is_right boolean;
  earned numeric := 0;
  available numeric := 0;
  answer_mark numeric;
  attempt_no integer;
  attempt_uuid uuid;
  result_percent numeric;
  result_pathway public.pathway;
  feedback_rows jsonb := '[]'::jsonb;
  previous public.topic_progress;
  new_average numeric;
  review_on date := current_date + 14;
begin
  select * into actor from public.user_profiles where id=auth.uid() and role='student' and archived_at is null;
  if actor.id is null then raise exception 'not_authorised' using errcode='42501'; end if;
  if jsonb_typeof(submitted_answers) <> 'object' or hint_count < 0 then
    raise exception 'invalid_submission' using errcode='22023';
  end if;
  select a.* into selected_activity from public.activities a
    join public.lessons l on l.id=a.lesson_id join public.topics t on t.id=l.topic_id
    join public.units u on u.id=t.unit_id join public.courses co on co.id=u.course_id
    where a.id=activity_uuid and a.archived_at is null and (a.release_at is null or a.release_at<=now())
      and exists(select 1 from public.enrolments e join public.classes c on c.id=e.class_id
        where e.student_id=actor.id and e.archived_at is null and c.course_id=co.id and c.archived_at is null);
  if selected_activity.id is null then raise exception 'activity_not_available' using errcode='42501'; end if;
  select l.topic_id into selected_topic from public.lessons l where l.id=selected_activity.lesson_id;
  select coalesce(max(a.attempt_number),0)+1 into attempt_no from public.attempts a
    where a.learner_id=actor.id and a.activity_id=activity_uuid;
  if attempt_no > selected_activity.max_attempts then raise exception 'attempt_limit_reached' using errcode='22023'; end if;
  insert into public.attempts(learner_id,activity_id,attempt_number,pathway,hints_used)
    values(actor.id,activity_uuid,attempt_no,selected_activity.pathway,hint_count) returning id into attempt_uuid;
  for answer_row in
    select q.* from public.activity_questions aq join public.questions q on q.id=aq.question_id
      where aq.activity_id=activity_uuid and q.archived_at is null order by aq.sort_order
  loop
    supplied := submitted_answers -> answer_row.id::text;
    is_right := false;
    if answer_row.kind='multiple_response' then
      select coalesce(array_agg(lower(trim(value)) order by lower(trim(value))),'{}') into accepted
        from jsonb_array_elements_text(answer_row.correct_answer);
      is_right := accepted = (select coalesce(array_agg(lower(trim(value)) order by lower(trim(value))),'{}')
        from jsonb_array_elements_text(coalesce(supplied,'[]'::jsonb)));
    elsif answer_row.kind='numeric' then
      begin
        is_right := abs((supplied#>>'{}')::numeric-(answer_row.correct_answer#>>'{}')::numeric)
          <= coalesce(answer_row.numeric_tolerance,0);
      exception when invalid_text_representation then is_right := false;
      end;
    elsif answer_row.kind in ('fill_blank','short_text','code_output') then
      select array_agg(lower(trim(value))) into accepted from (
        select answer_row.correct_answer#>>'{}' value
        union all select jsonb_array_elements_text(answer_row.acceptable_answers)
      ) valueset;
      is_right := lower(regexp_replace(trim(coalesce(supplied#>>'{}','')),'\s+',' ','g')) = any(accepted);
    else
      is_right := lower(trim(coalesce(supplied#>>'{}',''))) = lower(trim(answer_row.correct_answer#>>'{}'));
    end if;
    answer_mark := case when is_right then answer_row.marks else 0 end;
    earned := earned + answer_mark; available := available + answer_row.marks;
    insert into public.attempt_answers(attempt_id,question_id,answer,mark,max_mark,is_correct,feedback)
      values(attempt_uuid,answer_row.id,coalesce(supplied,'null'::jsonb),answer_mark,answer_row.marks,is_right,answer_row.explanation);
    feedback_rows := feedback_rows || jsonb_build_array(jsonb_build_object(
      'questionId',answer_row.id,'correct',is_right,'mark',answer_mark,'maxMark',answer_row.marks,
      'correctAnswer',answer_row.correct_answer,'explanation',answer_row.explanation
    ));
  end loop;
  result_percent := case when available=0 then 0 else round(earned/available*100,2) end;
  result_pathway := public.pathway_for(result_percent,hint_count);
  update public.attempts set completed_at=now(),mark=earned,max_mark=available,percentage=result_percent,
    feedback_shown=true,pathway=result_pathway where id=attempt_uuid;
  select * into previous from public.topic_progress where learner_id=actor.id and topic_id=selected_topic;
  new_average := case when previous.learner_id is null then result_percent
    else round(((previous.average_score*previous.attempt_count)+result_percent)/(previous.attempt_count+1),2) end;
  insert into public.topic_progress(learner_id,topic_id,first_score,latest_score,best_score,average_score,attempt_count,completion_rate,current_pathway)
    values(actor.id,selected_topic,result_percent,result_percent,result_percent,result_percent,1,100,result_pathway)
  on conflict(learner_id,topic_id) do update set latest_score=excluded.latest_score,
    best_score=greatest(public.topic_progress.best_score,excluded.best_score),average_score=new_average,
    attempt_count=public.topic_progress.attempt_count+1,completion_rate=100,current_pathway=result_pathway,updated_at=now();
  if not exists(select 1 from public.targets where learner_id=actor.id and topic_id=selected_topic and status in ('proposed','active')) then
    insert into public.targets(learner_id,topic_id,target_text,reason,target_date,evidence)
    select actor.id,selected_topic,
      format('Complete the %s %s practice and achieve at least %s%% in the review check by %s.',
        t.title,result_pathway,case result_pathway when 'Support' then 70 when 'Core' then 75 when 'Stretch' then 85 else 90 end,
        to_char(review_on,'DD Mon YYYY')),
      format('Latest recorded score: %s%%.',result_percent),review_on,
      jsonb_build_object('attempt_id',attempt_uuid,'score',result_percent,'pathway',result_pathway)
    from public.topics t where t.id=selected_topic;
  end if;
  return jsonb_build_object('attemptId',attempt_uuid,'mark',earned,'maxMark',available,
    'percentage',result_percent,'pathway',result_pathway,'feedback',feedback_rows);
end $$;

revoke all on function public.create_class(text,uuid,uuid,text) from public;
revoke all on function public.join_class(text) from public;
revoke all on function public.submit_activity(uuid,jsonb,integer) from public;
grant execute on function public.create_class(text,uuid,uuid,text) to authenticated;
grant execute on function public.join_class(text) to authenticated;
grant execute on function public.submit_activity(uuid,jsonb,integer) to authenticated;
revoke insert, update, delete on public.attempts, public.attempt_answers, public.topic_progress, public.targets from authenticated;
