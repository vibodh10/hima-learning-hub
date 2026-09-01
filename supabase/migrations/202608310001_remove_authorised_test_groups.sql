-- One-time, user-authorised production cleanup of the two named test groups.
-- The learner account is removed first through the separately authorised
-- learner-data deletion workflow. A fresh database or an already-cleaned
-- database is a no-op; if either production target ID is present, the migration
-- still refuses to continue unless the complete authorised scope matches.

do $$
declare
  target_ids constant uuid[] := array[
    '7fb2fb00-2db2-4161-acb5-67e88be5a72b'::uuid,
    'baea00fc-6085-459a-9464-08d7b044a823'::uuid
  ];
  expected_class_count integer;
  present_target_count integer;
  expected_invitation_count integer;
  target_organisation_id uuid;
  cleanup_actor_id uuid;
  deleted_class_count integer;
begin
  select count(*) into present_target_count
  from public.classes where id=any(target_ids);
  if present_target_count=0 then
    return;
  end if;

  select count(*)
  into expected_class_count
  from public.classes
  where (id='7fb2fb00-2db2-4161-acb5-67e88be5a72b'::uuid and name='L3 Computing Integration Test')
     or (id='baea00fc-6085-459a-9464-08d7b044a823'::uuid and name='Python Unit 4');

  if present_target_count<>2
    or expected_class_count<>2
    or (select count(distinct organisation_id) from public.classes where id=any(target_ids))<>1 then
    raise exception 'authorised_test_group_scope_mismatch';
  end if;

  select organisation_id into target_organisation_id
  from public.classes where id=target_ids[1];

  if exists(select 1 from public.enrolments where class_id=any(target_ids)) then
    raise exception 'authorised_test_groups_still_have_enrolments';
  end if;

  select count(*) into expected_invitation_count
  from public.student_invitations where class_id=any(target_ids);
  if expected_invitation_count<>2 then
    raise exception 'authorised_test_group_invitation_count_mismatch';
  end if;

  select id into cleanup_actor_id
  from public.user_profiles
  where organisation_id=target_organisation_id
    and role='administrator'
    and display_name='Hima'
    and archived_at is null;
  if cleanup_actor_id is null then
    raise exception 'authorised_cleanup_actor_not_found';
  end if;

  -- Delete dependent records from the leaves inward. Most of these tables are
  -- empty after the learner deletion, but listing all class-scoped stores keeps
  -- the cleanup safe if an operational record was created in the meantime.
  delete from public.weekly_plan_activities
  where weekly_plan_id in(select id from public.weekly_plans where class_id=any(target_ids));
  delete from public.assessment_skill_results
  where assessment_instance_id in(select id from public.assessment_instances where class_id=any(target_ids));
  delete from public.learner_catch_up_events
  where catch_up_id in(select id from public.learner_catch_up_records where class_id=any(target_ids));
  delete from public.reminders
  where deadline_id in(select id from public.deadlines where class_id=any(target_ids));

  delete from public.student_invitations where class_id=any(target_ids);
  delete from public.attendance_events where class_id=any(target_ids);
  delete from public.learner_recognitions where class_id=any(target_ids);
  delete from public.learner_catch_up_records where class_id=any(target_ids);
  delete from public.learner_portfolio_artifacts where class_id=any(target_ids);
  delete from public.learner_topic_worksheets where class_id=any(target_ids);
  delete from public.activity_allocations where class_id=any(target_ids);
  delete from public.assessment_instances where class_id=any(target_ids);
  delete from public.weekly_plans where class_id=any(target_ids);
  delete from public.gamification_settings where class_id=any(target_ids);
  delete from public.pathway_thresholds where class_id=any(target_ids);
  delete from public.progress_snapshots where class_id=any(target_ids);
  delete from public.teacher_actions where class_id=any(target_ids);
  delete from public.teacher_notes where class_id=any(target_ids);
  delete from public.targets where class_id=any(target_ids);
  delete from public.interventions where class_id=any(target_ids);
  delete from public.student_import_batches where class_id=any(target_ids);
  delete from public.enrolment_history
  where from_class_id=any(target_ids) or to_class_id=any(target_ids);
  delete from public.deadlines where class_id=any(target_ids);
  delete from public.group_learning_journeys where class_id=any(target_ids);
  delete from public.class_units where class_id=any(target_ids);
  delete from public.class_teachers where class_id=any(target_ids);
  delete from public.enrolments where class_id=any(target_ids);

  delete from public.classes where id=any(target_ids);
  get diagnostics deleted_class_count=row_count;
  if deleted_class_count<>2 then
    raise exception 'authorised_test_group_delete_count_mismatch';
  end if;

  insert into public.audit_logs(
    organisation_id,actor_id,action,entity_type,entity_id,after_data
  ) values (
    target_organisation_id,cleanup_actor_id,'test_data.permanently_deleted',
    'authorised_cleanup',null,
    jsonb_build_object(
      'deleted_groups',jsonb_build_array('L3 Computing Integration Test','Python Unit 4'),
      'deleted_group_count',deleted_class_count,
      'deleted_invitation_count',expected_invitation_count,
      'authorisation','User confirmed permanent deletion on 2026-08-31'
    )
  );
end
$$;
