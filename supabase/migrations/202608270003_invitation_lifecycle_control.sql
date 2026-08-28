-- Teacher-controlled invitation cancellation and expiry, plus an explicit
-- distinction between an Auth account and a fully provisioned learner profile.

alter table public.student_invitations
  add column if not exists cancelled_at timestamptz,
  add column if not exists expired_at timestamptz;

drop function if exists public.resolve_invitable_auth_user(text);

create function public.resolve_invitable_auth_user(target_email text)
returns table(
  account_exists boolean,
  user_id uuid,
  profile_exists boolean,
  permitted boolean,
  block_code text
)
language plpgsql stable security definer set search_path=''
as $$
declare
  actor public.user_profiles;
  auth_user auth.users;
  profile public.user_profiles;
begin
  actor:=public.current_profile();
  if actor.id is null or actor.role not in ('teacher','administrator') then
    raise exception 'not_authorised' using errcode='42501';
  end if;

  select * into auth_user from auth.users
  where lower(email)=lower(trim(target_email))
  order by created_at limit 1;

  if auth_user.id is null then
    return query select false,null::uuid,false,true,null::text;
    return;
  end if;

  select * into profile from public.user_profiles where id=auth_user.id;
  if profile.id is null then
    if exists (
      select 1 from public.student_invitations invitation
      where invitation.auth_user_id=auth_user.id
        and invitation.status in ('pending','sent','accepted')
        and invitation.organisation_id<>actor.organisation_id
    ) then
      return query select true,null::uuid,false,false,'different_organisation'::text;
      return;
    end if;
    return query select true,auth_user.id,false,true,null::text;
  elsif profile.organisation_id<>actor.organisation_id then
    return query select true,null::uuid,true,false,'different_organisation'::text;
  elsif profile.role<>'student' then
    return query select true,null::uuid,true,false,'staff_account'::text;
  elsif profile.archived_at is not null then
    return query select true,null::uuid,true,false,'archived_account'::text;
  end if;

  return query select true,auth_user.id,true,true,null::text;
end;
$$;

revoke all on function public.resolve_invitable_auth_user(text) from public,anon;
grant execute on function public.resolve_invitable_auth_user(text) to authenticated;

create or replace function public.manage_student_invitation(
  invitation_uuid uuid,
  requested_status text
) returns text
language plpgsql security definer set search_path=''
as $$
declare
  actor public.user_profiles;
  selected_invitation public.student_invitations;
  changed_at timestamptz:=now();
  provisional_enrolment_archived boolean:=false;
  detail_code text;
begin
  actor:=public.current_profile();
  if actor.id is null or actor.role not in ('teacher','administrator') then
    raise exception 'not_authorised' using errcode='42501';
  end if;
  if requested_status not in ('cancelled','expired') then
    raise exception 'invalid_invitation_status' using errcode='22023';
  end if;

  select * into selected_invitation
  from public.student_invitations
  where id=invitation_uuid
  for update;

  if selected_invitation.id is null
    or selected_invitation.organisation_id<>actor.organisation_id
    or not public.can_manage_class(selected_invitation.class_id) then
    raise exception 'not_authorised' using errcode='42501';
  end if;
  if selected_invitation.status='accepted' then
    raise exception 'accepted_invitation_is_final' using errcode='22023';
  end if;
  if selected_invitation.status=requested_status then
    return requested_status;
  end if;
  if requested_status='expired' and selected_invitation.status not in ('pending','sent') then
    raise exception 'invitation_cannot_expire' using errcode='22023';
  end if;
  if requested_status='cancelled'
    and selected_invitation.status not in ('pending','sent','failed','expired') then
    raise exception 'invitation_cannot_cancel' using errcode='22023';
  end if;

  -- Older application versions provisioned immediately after requesting an
  -- Auth email. Remove only that provisional class access: independently joined
  -- enrolments carry an enrolment.joined audit entry and are preserved.
  if requested_status='cancelled'
    and selected_invitation.auth_user_id is not null
    and not exists (
      select 1 from public.student_invitation_events event
      where event.invitation_id=selected_invitation.id and event.status='accepted'
    )
    and not exists (
      select 1 from public.audit_logs audit
      where audit.action='enrolment.joined'
        and audit.entity_id=selected_invitation.class_id
        and audit.after_data->>'student_id'=selected_invitation.auth_user_id::text
        and audit.occurred_at>=selected_invitation.invited_at
    ) then
    update public.enrolments
    set archived_at=changed_at
    where class_id=selected_invitation.class_id
      and student_id=selected_invitation.auth_user_id
      and archived_at is null;
    provisional_enrolment_archived:=found;
  end if;

  detail_code:=case requested_status
    when 'cancelled' then 'teacher_cancelled'
    else 'teacher_marked_expired'
  end;

  update public.student_invitations
  set status=requested_status,
      last_detail_code=detail_code,
      cancelled_at=case when requested_status='cancelled' then changed_at else cancelled_at end,
      expired_at=case when requested_status='expired' then changed_at else expired_at end,
      updated_at=changed_at
  where id=selected_invitation.id;

  insert into public.student_invitation_events(invitation_id,actor_id,status,detail_code)
  values(selected_invitation.id,actor.id,requested_status,detail_code);

  insert into public.audit_logs(
    organisation_id,actor_id,action,entity_type,entity_id,before_data,after_data
  ) values (
    actor.organisation_id,actor.id,
    case requested_status
      when 'cancelled' then 'student.invitation_cancelled'
      else 'student.invitation_expired'
    end,
    'student_invitation',selected_invitation.id,
    jsonb_build_object('status',selected_invitation.status),
    jsonb_build_object(
      'status',requested_status,
      'class_id',selected_invitation.class_id,
      'provisional_enrolment_archived',provisional_enrolment_archived
    )
  );

  return requested_status;
end;
$$;

revoke all on function public.manage_student_invitation(uuid,text) from public,anon;
grant execute on function public.manage_student_invitation(uuid,text) to authenticated;

comment on function public.manage_student_invitation(uuid,text) is
  'Atomically cancels or expires a manageable, unaccepted student invitation and records the transition without storing Auth tokens.';
