-- Begin the shared class journey when the first invited student genuinely
-- joins. Invitation delivery alone is not evidence of joining, so activation
-- requires an accepted invitation, a linked learner account and an active
-- enrolment. Missing journey configuration must never block onboarding.

create or replace function public.activate_group_journey_after_invitation_acceptance()
returns trigger
language plpgsql security definer set search_path=''
as $$
declare
  selected_class public.classes;
  selected_template public.learning_journey_templates;
  created_uuid uuid;
begin
  if new.status<>'accepted'
    or new.auth_user_id is null
    or (tg_op='UPDATE' and old.status='accepted') then
    return new;
  end if;

  select class.* into selected_class
  from public.classes class
  where class.id=new.class_id
  for update;

  if selected_class.id is null
    or selected_class.archived_at is not null
    or not selected_class.published
    or selected_class.active_unit_id is null
    or not exists(
      select 1 from public.enrolments enrolment
      where enrolment.class_id=new.class_id
        and enrolment.student_id=new.auth_user_id
        and enrolment.archived_at is null
    )
    or not exists(
      select 1 from public.class_units class_unit
      where class_unit.class_id=new.class_id
        and class_unit.unit_id=selected_class.active_unit_id
        and class_unit.active
        and class_unit.archived_at is null
    ) then
    return new;
  end if;

  -- Automatic activation is a one-time class bootstrap. A later invitation
  -- must not silently restart a completed or cancelled teaching journey.
  if exists(
    select 1 from public.group_learning_journeys journey
    where journey.class_id=new.class_id and journey.archived_at is null
  ) then
    return new;
  end if;

  select template.* into selected_template
  from public.learning_journey_templates template
  where template.unit_id=selected_class.active_unit_id
    and template.status='approved'
    and template.archived_at is null
  order by template.version_number desc,template.approved_at desc nulls last
  limit 1;

  if selected_template.id is null then
    return new;
  end if;

  begin
    insert into public.group_learning_journeys(
      class_id,template_id,unit_id,started_by,settings
    ) values(
      new.class_id,selected_template.id,selected_template.unit_id,new.invited_by,
      jsonb_build_object(
        'start_mode','automatic_first_accepted_invitation',
        'invitation_id',new.id
      )
    ) returning id into created_uuid;
  exception when unique_violation then
    -- A concurrent staff action may have activated the class after the
    -- pre-check. Invitation acceptance remains successful and idempotent.
    return new;
  end;

  insert into public.audit_logs(
    organisation_id,actor_id,action,entity_type,entity_id,after_data
  ) values(
    selected_class.organisation_id,new.invited_by,
    'group_journey.auto_started','group_learning_journey',created_uuid,
    jsonb_build_object(
      'class_id',new.class_id,
      'template_id',selected_template.id,
      'unit_id',selected_template.unit_id,
      'invitation_id',new.id,
      'learner_id',new.auth_user_id,
      'total_teaching_weeks',selected_template.total_teaching_weeks
    )
  );

  return new;
end;
$$;

drop trigger if exists student_invitation_acceptance_starts_journey
  on public.student_invitations;
create trigger student_invitation_acceptance_starts_journey
after insert or update of status on public.student_invitations
for each row execute function public.activate_group_journey_after_invitation_acceptance();

revoke all on function public.activate_group_journey_after_invitation_acceptance()
  from public,anon,authenticated;

comment on function public.activate_group_journey_after_invitation_acceptance() is
  'Starts one approved shared journey after the first accepted, account-linked invitation has an active class enrolment; invitation acceptance never fails when no journey is configured.';
