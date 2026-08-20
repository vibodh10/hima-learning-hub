create or replace function public.teacher_archive_enrolment(
  learner_uuid uuid,
  class_uuid uuid,
  reason_value text
) returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  actor public.user_profiles;
  changed integer;
begin
  select * into actor
  from public.user_profiles
  where id=auth.uid()
    and role in ('teacher','administrator')
    and archived_at is null;

  if actor.id is null
    or not public.can_manage_class(class_uuid)
    or length(trim(reason_value)) < 3 then
    raise exception 'not_authorised' using errcode='42501';
  end if;

  update public.enrolments
  set archived_at=now()
  where class_id=class_uuid
    and student_id=learner_uuid
    and archived_at is null;
  get diagnostics changed=row_count;

  if changed<>1 then
    raise exception 'enrolment_not_available' using errcode='22023';
  end if;

  insert into public.enrolment_history(
    student_id,from_class_id,to_class_id,moved_by,reason
  ) values (
    learner_uuid,class_uuid,null,actor.id,trim(reason_value)
  );

  insert into public.audit_logs(
    organisation_id,actor_id,action,entity_type,entity_id,after_data
  ) values (
    actor.organisation_id,actor.id,'enrolment.archived','learner',learner_uuid,
    jsonb_build_object('class_id',class_uuid,'reason',trim(reason_value))
  );
end $$;

revoke all on function public.teacher_archive_enrolment(uuid,uuid,text) from public;
grant execute on function public.teacher_archive_enrolment(uuid,uuid,text) to authenticated;

