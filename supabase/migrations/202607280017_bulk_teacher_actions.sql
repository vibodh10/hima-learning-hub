create or replace function public.teacher_record_bulk_action(
  class_uuid uuid,
  learner_uuids uuid[],
  action_value text,
  reason_value text,
  review_value date,
  outcome_value text
) returns integer
language plpgsql
security definer
set search_path=''
as $$
declare actor public.user_profiles; changed integer;
begin
  select * into actor from public.user_profiles
  where id=auth.uid() and role in ('teacher','administrator') and archived_at is null;
  if actor.id is null or not public.can_manage_class(class_uuid)
    or cardinality(learner_uuids) not between 1 and 100
    or length(trim(action_value))<3 or length(trim(reason_value))<3
    or exists(select 1 from unnest(learner_uuids) learner_id
      where not exists(select 1 from public.enrolments e
        where e.class_id=class_uuid and e.student_id=learner_id
          and e.archived_at is null)) then
    raise exception 'invalid_bulk_teacher_action' using errcode='22023';
  end if;
  insert into public.teacher_actions(
    organisation_id,class_id,learner_id,teacher_id,action,reason,
    review_on,outcome,metadata
  )
  select actor.organisation_id,class_uuid,learner_id,actor.id,
    trim(action_value),trim(reason_value),review_value,
    nullif(trim(outcome_value),''),jsonb_build_object('bulk',true)
  from unnest(learner_uuids) learner_id;
  get diagnostics changed=row_count;
  insert into public.audit_logs(
    organisation_id,actor_id,action,entity_type,entity_id,after_data
  ) values(
    actor.organisation_id,actor.id,'teacher_action.bulk_recorded','class',class_uuid,
    jsonb_build_object('learner_ids',to_jsonb(learner_uuids),'action',trim(action_value),
      'reason',trim(reason_value),'count',changed)
  );
  return changed;
end $$;

revoke all on function public.teacher_record_bulk_action(uuid,uuid[],text,text,date,text) from public;
grant execute on function public.teacher_record_bulk_action(uuid,uuid[],text,text,date,text) to authenticated;

