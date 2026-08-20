\set ON_ERROR_STOP on

-- Supabase normally supplies these API grants. The migration deliberately
-- narrows questions again to safe display columns.
grant select on public.user_profiles, public.academic_years, public.courses,
  public.units, public.topics, public.classes, public.enrolments, public.lessons,
  public.activities, public.question_options, public.activity_questions,
  public.attempts, public.attempt_answers, public.topic_progress, public.targets,
  public.deadlines, public.reminders, public.interventions, public.teacher_notes,
  public.achievements to authenticated;

-- Use an additional fictional learner to prove cross-learner isolation.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values('00000000-0000-0000-0000-000000000000','90000000-0000-0000-0000-000000000003','authenticated','authenticated',
'other.learner@northbridge.example',extensions.crypt('LocalOther!26',extensions.gen_salt('bf')),now(),'{}','{}',now(),now());
insert into public.user_profiles(id,organisation_id,role,display_name)
values('90000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','student','Jordan Ahmed');

set role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',false);
select public.create_class(
  'L3 Computing B',
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'HIMA-B-26'
) as created_class \gset
\if :{?created_class}
\else
  \quit 1
\endif

select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000003',false);
select public.join_class('HIMA-B-26') as joined_class \gset
\if :{?joined_class}
\else
  \quit 1
\endif

create temporary table journey_result(payload jsonb);
insert into journey_result
select public.submit_activity(
  '70000000-0000-0000-0000-000000000001',
  '{
    "80000000-0000-0000-0000-000000000001":"Firewall",
    "80000000-0000-0000-0000-000000000002":"true",
    "80000000-0000-0000-0000-000000000003":"depth",
    "80000000-0000-0000-0000-000000000004":["Separate network segment","Firewall rules"],
    "80000000-0000-0000-0000-000000000005":"80"
  }'::jsonb,0
) as payload;

do $$
declare payload jsonb := (select r.payload from journey_result r);
begin
  if (payload->>'percentage')::numeric <> 100 then raise exception 'expected 100 percent, got %',payload; end if;
  if payload->>'pathway' <> 'Mastery' then raise exception 'expected Mastery, got %',payload; end if;
  if jsonb_array_length(payload->'feedback') <> 5 then raise exception 'expected five feedback rows'; end if;
end $$;

do $$
begin
  if (select count(*) from public.attempts where learner_id='90000000-0000-0000-0000-000000000003') <> 1 then
    raise exception 'attempt was not persisted';
  end if;
  if (select count(*) from public.attempt_answers aa join public.attempts a on a.id=aa.attempt_id
      where a.learner_id='90000000-0000-0000-0000-000000000003') <> 5 then
    raise exception 'five immutable answers were not persisted';
  end if;
  if not exists(select 1 from public.topic_progress where learner_id='90000000-0000-0000-0000-000000000003'
      and latest_score=100 and current_pathway='Mastery') then
    raise exception 'topic progress was not updated';
  end if;
  if not exists(select 1 from public.targets where learner_id='90000000-0000-0000-0000-000000000003'
      and status='proposed') then raise exception 'target was not generated'; end if;
end $$;

-- A different learner must see no attempt or profile belonging to Jordan.
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000002',false);
do $$
begin
  if exists(select 1 from public.attempts where learner_id='90000000-0000-0000-0000-000000000003') then
    raise exception 'cross-learner attempt leak';
  end if;
  if exists(select 1 from public.user_profiles where id='90000000-0000-0000-0000-000000000003') then
    raise exception 'cross-learner profile leak';
  end if;
end $$;

-- Re-authenticating as the submitting learner proves the stored result remains.
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000003',false);
do $$
begin
  if not exists(select 1 from public.attempts where percentage=100) then
    raise exception 'saved result did not survive session change';
  end if;
  begin
    perform correct_answer from public.questions limit 1;
    raise exception 'learner could read correct answers';
  exception when insufficient_privilege then null;
  end;
end $$;

-- The owning teacher can see the learner and result through RLS.
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',false);
do $$
begin
  if not exists(select 1 from public.attempts where learner_id='90000000-0000-0000-0000-000000000003' and percentage=100) then
    raise exception 'authorised teacher cannot see learner result';
  end if;
end $$;

reset role;
select 'vertical slice database journey passed' as result;
