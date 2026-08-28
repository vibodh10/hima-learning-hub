-- Keep authorised learner deletion complete as new evidence stores are added.
-- The original routine predates formative review, workbook, portfolio,
-- catch-up, attendance, achievement-point and invitation-event records.

create or replace function public.block_achievement_event_mutation()
returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='DELETE'
    and current_setting('app.authorised_learner_deletion',true)=old.learner_id::text then
    return old;
  end if;
  raise exception 'achievement_evidence_is_append_only' using errcode='55000';
end $$;

create or replace function public.reject_immutable_learner_artifact_mutation()
returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='DELETE'
    and current_setting('app.authorised_learner_deletion',true)=old.learner_id::text then
    return old;
  end if;
  raise exception 'learner_evidence_is_append_only' using errcode='55000';
end $$;

create or replace function public.admin_execute_learner_data_deletion(
  request_uuid uuid,
  confirmation_value text
) returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  actor public.user_profiles;
  request_row public.learner_data_deletion_requests;
  learner_uuid uuid;
  learner_label text;
begin
  select * into actor from public.user_profiles
  where id=auth.uid() and role='administrator' and archived_at is null;
  select * into request_row from public.learner_data_deletion_requests
  where id=request_uuid and status='pending';
  learner_uuid:=request_row.learner_id;
  select display_name into learner_label from public.user_profiles where id=learner_uuid;
  if actor.id is null or request_row.id is null
    or request_row.organisation_id<>actor.organisation_id
    or confirmation_value<>'DELETE LEARNER DATA' then
    raise exception 'deletion_not_authorised' using errcode='42501';
  end if;
  perform set_config('app.authorised_learner_deletion',learner_uuid::text,true);

  -- Retained operational history must no longer reference the deleted profile.
  update public.audit_logs set actor_id=null where actor_id=learner_uuid;
  update public.student_invitation_events set actor_id=null where actor_id=learner_uuid;
  update public.attempt_answers set teacher_override_by=null where teacher_override_by=learner_uuid;
  update public.attempts set teacher_override_by=null where teacher_override_by=learner_uuid;
  update public.coin_transactions set created_by=null where created_by=learner_uuid;

  -- Delete newer learner evidence before the original attempt/enrolment rows.
  delete from public.formative_response_reviews where learner_id=learner_uuid;
  delete from public.activity_unlock_overrides where learner_id=learner_uuid;
  delete from public.learner_recognitions where learner_id=learner_uuid;
  delete from public.certificate_eligibility_reviews where learner_id=learner_uuid;
  delete from public.learner_achievement_point_events where learner_id=learner_uuid;
  delete from public.attendance_events where learner_id=learner_uuid;
  delete from public.learner_catch_up_records where learner_id=learner_uuid;
  delete from public.learner_portfolio_artifacts where learner_id=learner_uuid;
  delete from public.learner_topic_worksheets where learner_id=learner_uuid;

  delete from public.reward_purchases where learner_id=learner_uuid;
  delete from public.badge_awards where learner_id=learner_uuid;
  delete from public.coin_transactions where learner_id=learner_uuid;
  delete from public.practice_days where learner_id=learner_uuid;
  delete from public.practice_streaks where learner_id=learner_uuid;
  delete from public.retrieval_schedules where learner_id=learner_uuid;
  delete from public.learner_misconceptions where learner_id=learner_uuid;
  delete from public.skill_mastery where learner_id=learner_uuid;
  delete from public.skill_progress_comparisons where learner_id=learner_uuid;
  delete from public.assessment_skill_results where assessment_instance_id in(
    select id from public.assessment_instances where learner_id=learner_uuid
  );
  delete from public.assessment_instances where learner_id=learner_uuid;
  delete from public.activity_allocations where learner_id=learner_uuid;
  delete from public.topic_skip_evidence where learner_id=learner_uuid;
  delete from public.learner_routes where learner_id=learner_uuid;
  delete from public.pathway_overrides where learner_id=learner_uuid;
  delete from public.progress_snapshots where learner_id=learner_uuid;
  delete from public.teacher_actions where learner_id=learner_uuid;
  delete from public.interventions where learner_id=learner_uuid;
  delete from public.teacher_notes where learner_id=learner_uuid;
  delete from public.reminders where user_id=learner_uuid;
  delete from public.targets where learner_id=learner_uuid;
  delete from public.topic_progress where learner_id=learner_uuid;
  delete from public.achievements where learner_id=learner_uuid;
  delete from public.attempt_answers where attempt_id in(
    select id from public.attempts where learner_id=learner_uuid
  );
  delete from public.attempts where learner_id=learner_uuid;
  delete from public.gamification_settings where learner_id=learner_uuid;
  delete from public.enrolment_history where student_id=learner_uuid;
  delete from public.enrolments where student_id=learner_uuid;

  -- Preserve every previous authorisation record without retaining its live FK.
  update public.learner_data_deletion_requests
  set learner_id=null,
      evidence=evidence||jsonb_build_object('deleted_learner_id',learner_uuid)
  where learner_id=learner_uuid and id<>request_uuid;

  update public.learner_data_deletion_requests
  set learner_id=null,status='completed',completed_by=actor.id,completed_at=now(),
      evidence=evidence||jsonb_build_object(
        'deleted_learner_id',learner_uuid,
        'deleted_display_name',learner_label,
        'authorised_reason',request_row.reason
      )
  where id=request_uuid;

  -- Cascade-enabled learner-only stores are removed with the profile.
  delete from public.user_profiles where id=learner_uuid;
  delete from auth.identities where user_id=learner_uuid;
  delete from auth.users where id=learner_uuid;

  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'learner_data.deleted','deletion_request',request_uuid,
    jsonb_build_object('request_id',request_uuid,'deleted_learner_id',learner_uuid));
end $$;

revoke all on function public.admin_execute_learner_data_deletion(uuid,text) from public,anon;
grant execute on function public.admin_execute_learner_data_deletion(uuid,text) to authenticated;

comment on function public.admin_execute_learner_data_deletion(uuid,text) is
  'Permanently deletes an authorised learner account and all current learner evidence while retaining de-identified authorisation and audit history.';
