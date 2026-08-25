\set ON_ERROR_STOP on

update public.user_profiles set role='administrator'
where id='90000000-0000-0000-0000-000000000001';
grant select on public.assessment_blueprints,public.curriculum_versions,public.misconceptions,public.courses to authenticated;
create temporary table review_question_ids(id uuid);
grant select on review_question_ids to authenticated;
insert into review_question_ids
select q.id from public.questions q
where q.skill_id is not null
  and exists(select 1 from public.misconceptions m where m.skill_id=q.skill_id)
order by q.updated_at,q.id limit 1;
update public.questions set status='draft'
where id=(select id from review_question_ids);

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set role authenticated;

select public.teacher_review_question(
  (select id from review_question_ids),
  'Reviewed formative question wording with a clear technical scenario.',
  null,null,
  'This explanation identifies the technical principle and applies it to the scenario.',
  'Correct — the principle has been applied accurately.',
  'Review the worked example and identify the relevant technical principle.',
  'Focus on the evidence in the scenario.',
  2,90,'Stretch','approved',
  (select b.id from public.assessment_blueprints b
    join public.questions q on q.id=(select id from review_question_ids)
    join public.curriculum_versions cv on cv.id=b.curriculum_version_id
    where cv.course_id=q.course_id and (b.unit_id is null or b.unit_id=q.unit_id)
      and b.status='approved' limit 1),
  'technical-application',
  array['reviewed','scenario'],
  array[(select m.id from public.misconceptions m
    join public.questions q on q.skill_id=m.skill_id
    where q.id=(select id from review_question_ids) limit 1)],
  null
);
reset role;

do $$
begin
  if not exists(select 1 from public.questions
    where id=(select id from review_question_ids)
      and question_text like 'Reviewed formative%'
      and pathway='Stretch' and difficulty='Stretch'
      and marks=2 and estimated_seconds=90 and status='approved'
      and blueprint_category='technical-application'
      and tags @> array['reviewed','scenario']) then
    raise exception 'question-bank review fields were not saved';
  end if;
  if not exists(select 1 from public.question_misconceptions
    where question_id=(select id from review_question_ids)) then
    raise exception 'misconception mapping was not saved';
  end if;
  if not exists(select 1 from public.audit_logs where action='question.reviewed'
    and entity_id=(select id from review_question_ids)) then
    raise exception 'question review audit evidence is missing';
  end if;
end $$;
