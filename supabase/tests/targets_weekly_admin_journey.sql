\set ON_ERROR_STOP on
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set role authenticated;

select public.teacher_create_target(
  '90000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'weekly',null,null,'52000000-0000-0000-0000-000000000003',
  'Complete equivalent Python input practice and achieve at least 70 percent independently.',
  'The starting-point evidence identified input conversion as the review focus.',
  '{"source":"starting-point"}',current_date,current_date+7,current_date+8,
  'At least 70 percent on an equivalent review without hints.',
  'Review at the next planned learning day.'
);

select public.teacher_save_weekly_plan(
  'a0000000-0000-0000-0000-000000000001',current_date,
  'Python foundations weekly cycle',3,true,now(),now()+interval '7 days'
);
reset role;

do $$
begin
  if not exists(select 1 from public.targets
      where learner_id='90000000-0000-0000-0000-000000000002'
        and level='weekly' and skill_id='52000000-0000-0000-0000-000000000003'
        and topic_id='51000000-0000-0000-0000-000000000001'
        and unit_id='40000000-0000-0000-0000-000000000004'
        and success_measure is not null and review_on is not null) then
    raise exception 'four-level measurable target creation failed';
  end if;
  if not exists(select 1 from public.weekly_plans
      where class_id='a0000000-0000-0000-0000-000000000001'
        and required_home_sessions=3 and retrieval_required) then
    raise exception 'weekly learning expectations were not stored';
  end if;
end $$;
