\set ON_ERROR_STOP on

update public.user_profiles set role='administrator'
where id='90000000-0000-0000-0000-000000000001';
grant select on public.courses,public.curriculum_versions to authenticated;
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set role authenticated;

create temporary table authored_ids(label text primary key,id uuid);
grant select,insert on authored_ids to authenticated;
insert into authored_ids values(
  'blueprint',public.teacher_create_assessment_blueprint(
    (select id from public.curriculum_versions
      where course_id='30000000-0000-0000-0000-000000000001'
        and active and archived_at is null limit 1),
    '40000000-0000-0000-0000-000000000004',
    'Teacher-authored progress point',
    'progress_point','approved'
  )
);
insert into authored_ids values(
  'activity',public.teacher_create_activity(
    '61000000-0000-0000-0000-000000000001',
    'Teacher-authored Python progress check',
    'review_check','mastery_check','Core',15,2,true,true,'draft',
    'Complete independently without hints.',null,'progress_point',
    (select id from authored_ids where label='blueprint')
  )
);
reset role;

do $$
begin
  if not exists(select 1 from public.assessment_blueprints
    where id=(select id from authored_ids where label='blueprint')
      and scope='progress_point' and status='approved') then
    raise exception 'assessment blueprint was not created';
  end if;
  if not exists(select 1 from public.activities
    where id=(select id from authored_ids where label='activity')
      and assessment_kind='progress_point'
      and blueprint_id=(select id from authored_ids where label='blueprint')
      and learning_stage='mastery_check' and status='draft') then
    raise exception 'teacher-authored assessment activity is incorrect';
  end if;
  if not exists(select 1 from public.audit_logs where action='assessment_blueprint.created')
    or not exists(select 1 from public.audit_logs where action='activity.created') then
    raise exception 'activity authoring audit evidence is missing';
  end if;
end $$;
