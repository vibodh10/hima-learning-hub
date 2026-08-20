alter type public.target_status add value if not exists 'approved';
alter type public.target_status add value if not exists 'extended';

create or replace function public.teacher_update_target(
  target_uuid uuid,
  status_value text,
  target_text_value text,
  note_value text
) returns void
language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; target_learner uuid; changed integer;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role in ('teacher','administrator') and archived_at is null;
  select learner_id into target_learner from public.targets
  where id=target_uuid and archived_at is null;
  if actor.id is null or target_learner is null
    or not public.can_access_learner(target_learner) then
    raise exception 'not_authorised' using errcode='42501';
  end if;
  if status_value not in (
      'proposed','approved','active','achieved','partially_achieved',
      'not_achieved','extended','replaced','archived'
    ) or length(trim(target_text_value))<10 then
    raise exception 'invalid_target' using errcode='22023';
  end if;
  update public.targets set
    target_text=trim(target_text_value),
    status=status_value::public.target_status,
    teacher_note=nullif(trim(note_value),''),
    approved_by=case when status_value in ('approved','active') then actor.id else approved_by end,
    approved_at=case when status_value in ('approved','active') then coalesce(approved_at,now()) else approved_at end,
    archived_at=case when status_value='archived' then now() else null end
  where id=target_uuid;
  get diagnostics changed=row_count;
  if changed<>1 then raise exception 'target_not_available' using errcode='42501'; end if;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'target.updated','target',target_uuid,
    jsonb_build_object('status',status_value,'text',trim(target_text_value),
      'note',nullif(trim(note_value),'')));
end $$;

create or replace function public.teacher_bulk_approve_targets(target_uuids uuid[])
returns integer language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; changed integer;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role in ('teacher','administrator') and archived_at is null;
  if actor.id is null or cardinality(target_uuids)<1 or cardinality(target_uuids)>100 then
    raise exception 'invalid_target_batch' using errcode='22023';
  end if;
  update public.targets set status='approved',approved_by=actor.id,approved_at=now()
  where id=any(target_uuids) and status='proposed' and archived_at is null
    and public.can_access_learner(learner_id);
  get diagnostics changed=row_count;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,after_data)
  values(actor.organisation_id,actor.id,'targets.bulk_approved','target',
    jsonb_build_object('requested',cardinality(target_uuids),'approved',changed));
  return changed;
end $$;

