-- Workbook decisions appear in learner evidence and reports. Keep the normal
-- teacher workflow, but route every write through one validated, audited
-- function instead of allowing direct browser inserts.

create or replace function public.teacher_record_workbook_decision(
  learner_uuid uuid,
  unit_code_value text,
  topic_code_value text,
  decision_type_value text,
  original_route_value text,
  new_route_value text,
  reason_value text,
  review_on_value date
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  actor public.user_profiles;
  decision_uuid uuid;
  normalised_unit_code text:=trim(unit_code_value);
  normalised_topic text:=nullif(trim(topic_code_value),'');
  normalised_original_route text:=nullif(trim(original_route_value),'');
  normalised_new_route text:=nullif(trim(new_route_value),'');
  normalised_reason text:=trim(reason_value);
begin
  actor:=public.current_profile();
  if actor.id is null or actor.role not in ('teacher','administrator') then
    raise exception 'not_authorised' using errcode='42501';
  end if;
  if learner_uuid is null
    or unit_code_value is null
    or length(normalised_unit_code) not between 1 and 20
    or decision_type_value is null
    or decision_type_value not in (
      'assign_topic','assign_mastery_check','assign_progress_point',
      'route_override','project_unlock','feedback','intervention','reflection_review'
    )
    or reason_value is null
    or length(normalised_reason) not between 10 and 1500
    or length(coalesce(normalised_topic,''))>20
    or length(coalesce(normalised_original_route,''))>80
    or length(coalesce(normalised_new_route,''))>80
    or (
      decision_type_value in ('route_override','project_unlock')
      and (normalised_original_route is null or normalised_new_route is null)
    ) then
    raise exception 'invalid_workbook_decision' using errcode='22023';
  end if;
  if not public.can_manage_workbook_learner_unit(learner_uuid,normalised_unit_code) then
    raise exception 'learner_or_unit_out_of_scope' using errcode='42501';
  end if;
  if normalised_topic is not null and not exists(
    select 1
    from public.units unit
    join public.learning_journey_templates template on template.unit_id=unit.id
    join public.learning_journey_weeks journey_week on journey_week.template_id=template.id
    where unit.code=normalised_unit_code
      and unit.archived_at is null
      and template.status='approved'
      and template.archived_at is null
      and journey_week.configuration->>'topic_code'=normalised_topic
  ) then
    raise exception 'topic_out_of_scope' using errcode='22023';
  end if;

  insert into public.workbook_teacher_decisions(
    organisation_id,learner_id,teacher_id,unit_code,topic_code,
    decision_type,original_route,new_route,reason,review_on
  ) values (
    actor.organisation_id,learner_uuid,actor.id,normalised_unit_code,normalised_topic,
    decision_type_value,normalised_original_route,normalised_new_route,
    normalised_reason,review_on_value
  ) returning id into decision_uuid;

  insert into public.audit_logs(
    organisation_id,actor_id,action,entity_type,entity_id,after_data
  ) values (
    actor.organisation_id,actor.id,'learner.workbook_decision_recorded',
    'workbook_teacher_decision',decision_uuid,
    jsonb_build_object(
      'learner_id',learner_uuid,
      'unit_code',normalised_unit_code,
      'topic_code',normalised_topic,
      'decision_type',decision_type_value,
      'review_on',review_on_value
    )
  );

  return decision_uuid;
end;
$$;

revoke insert,update,delete on public.workbook_teacher_decisions from authenticated,anon;
drop policy if exists workbook_teacher_decisions_insert on public.workbook_teacher_decisions;

revoke all on function public.teacher_record_workbook_decision(
  uuid,text,text,text,text,text,text,date
) from public,anon;
grant execute on function public.teacher_record_workbook_decision(
  uuid,text,text,text,text,text,text,date
) to authenticated;

comment on function public.teacher_record_workbook_decision(
  uuid,text,text,text,text,text,text,date
) is 'Records one validated teacher decision for an actively assigned learner/unit and writes a non-sensitive audit fact. Direct browser table writes are prohibited.';

comment on table public.workbook_teacher_decisions is
  'Server-authored teacher decisions used by learner evidence and reports. Authenticated clients retain scoped read access only.';
