create table public.learner_data_deletion_requests(
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  learner_id uuid references public.user_profiles(id),
  requested_by uuid not null references public.user_profiles(id),
  reason text not null,
  status text not null default 'pending'
    check(status in ('pending','completed','cancelled')),
  requested_at timestamptz not null default now(),
  completed_by uuid references public.user_profiles(id),
  completed_at timestamptz,
  evidence jsonb not null default '{}'
);

alter table public.learner_data_deletion_requests enable row level security;
create policy learner_deletion_admin_read
on public.learner_data_deletion_requests for select
using(
  organisation_id=(select organisation_id from public.current_profile())
  and public.is_admin()
);
revoke insert,update,delete on public.learner_data_deletion_requests from authenticated;
grant select on public.learner_data_deletion_requests to authenticated;

create or replace function public.admin_request_learner_data_deletion(
  learner_uuid uuid,
  reason_value text
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare actor public.user_profiles; request_uuid uuid;
begin
  select * into actor from public.user_profiles
  where id=auth.uid() and role='administrator' and archived_at is null;
  if actor.id is null
    or length(trim(reason_value))<10
    or not exists(select 1 from public.user_profiles where id=learner_uuid
      and organisation_id=actor.organisation_id and role='student') then
    raise exception 'invalid_deletion_request' using errcode='22023';
  end if;
  if exists(select 1 from public.learner_data_deletion_requests
    where learner_id=learner_uuid and status='pending') then
    raise exception 'deletion_already_pending' using errcode='23505';
  end if;
  insert into public.learner_data_deletion_requests(
    organisation_id,learner_id,requested_by,reason
  ) values(actor.organisation_id,learner_uuid,actor.id,trim(reason_value))
  returning id into request_uuid;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'learner_data.deletion_requested',
    'learner',learner_uuid,jsonb_build_object('request_id',request_uuid,'reason',trim(reason_value)));
  return request_uuid;
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

  update public.audit_logs set actor_id=null where actor_id=learner_uuid;
  update public.attempt_answers set teacher_override_by=null where teacher_override_by=learner_uuid;
  update public.attempts set teacher_override_by=null where teacher_override_by=learner_uuid;
  update public.coin_transactions set created_by=null where created_by=learner_uuid;

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

  update public.learner_data_deletion_requests
  set learner_id=null,status='completed',completed_by=actor.id,completed_at=now(),
      evidence=jsonb_build_object(
        'deleted_learner_id',learner_uuid,
        'deleted_display_name',learner_label,
        'authorised_reason',request_row.reason
      )
  where id=request_uuid;

  delete from public.user_profiles where id=learner_uuid;
  delete from auth.identities where user_id=learner_uuid;
  delete from auth.users where id=learner_uuid;

  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'learner_data.deleted','deletion_request',request_uuid,
    jsonb_build_object('request_id',request_uuid,'deleted_learner_id',learner_uuid));
end $$;

revoke all on function public.admin_request_learner_data_deletion(uuid,text) from public;
revoke all on function public.admin_execute_learner_data_deletion(uuid,text) from public;
grant execute on function public.admin_request_learner_data_deletion(uuid,text) to authenticated;
grant execute on function public.admin_execute_learner_data_deletion(uuid,text) to authenticated;
