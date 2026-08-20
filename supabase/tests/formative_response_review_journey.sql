\set ON_ERROR_STOP on

insert into public.skills(id,topic_id,code,title,description,sort_order)
values(
  '5f000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  'justify-security-control','Justify a security control',
  'Explain and justify a formative security decision.',99
) on conflict(topic_id,code) do nothing;

insert into public.activities(
  id,lesson_id,title,kind,pathway,estimated_minutes,max_attempts,
  learning_stage,status,automatic_marking
) values(
  '7f000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  'Security justification','in_class_practice','Core',10,3,
  'core_practice','approved',false
);

insert into public.questions(
  id,course_id,unit_id,topic_id,skill_id,difficulty,pathway,kind,
  question_text,correct_answer,acceptable_answers,explanation,marks,tags,status
) values(
  '8f000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000006',
  '50000000-0000-0000-0000-000000000001',
  '5f000000-0000-0000-0000-000000000001',
  'Core','Core','extended_response',
  'Explain why network segmentation can reduce risk.',
  '""'::jsonb,'[]'::jsonb,
  'A justified response links separated trust zones to reduced access and spread.',
  4,'{formative,security}','approved'
);
insert into public.activity_questions(activity_id,question_id,sort_order)
values(
  '7f000000-0000-0000-0000-000000000001',
  '8f000000-0000-0000-0000-000000000001',1
);

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set role authenticated;
do $$ begin
  perform public.submit_activity(
    '7f000000-0000-0000-0000-000000000001',
    '{"8f000000-0000-0000-0000-000000000001":"It limits access between networks and stops an incident spreading."}'::jsonb,
    0
  );
end $$;
reset role;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set role authenticated;
select public.teacher_review_formative_response(
  (select id from public.formative_response_reviews
    where learner_id='90000000-0000-0000-0000-000000000002' and status='pending'),
  4,
  'Clear justification linking access boundaries to reduced spread.',
  false
);
reset role;

do $$
begin
  if not exists(select 1 from public.formative_response_reviews
    where learner_id='90000000-0000-0000-0000-000000000002'
      and status='reviewed' and reviewed_mark=4 and reviewed_by='90000000-0000-0000-0000-000000000001') then
    raise exception 'formative response review was not completed';
  end if;
  if not exists(select 1 from public.attempt_answers aa
    join public.attempts a on a.id=aa.attempt_id
    where a.activity_id='7f000000-0000-0000-0000-000000000001'
      and aa.mark=4 and aa.is_correct
      and aa.feedback like 'Clear justification%') then
    raise exception 'reviewed mark and feedback were not applied';
  end if;
  if not exists(select 1 from public.attempts
    where activity_id='7f000000-0000-0000-0000-000000000001'
      and percentage=100 and teacher_override_by='90000000-0000-0000-0000-000000000001') then
    raise exception 'attempt aggregate was not recalculated';
  end if;
  if not exists(select 1 from public.audit_logs
    where action='formative_response.reviewed') then
    raise exception 'formative review audit evidence is missing';
  end if;
end $$;

