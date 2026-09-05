-- Keep the active learning journey aligned when staff correct the active unit
-- before any learner is enrolled. Once learners are active, the existing
-- journey is preserved and a unit change is rejected instead of rewriting
-- their evidence timeline.

create or replace function public.teacher_configure_class(
  class_uuid uuid,
  name_value text,
  period_uuid uuid,
  course_uuid uuid,
  unit_uuids uuid[],
  active_unit_uuid uuid,
  starts_value date,
  ends_value date,
  weekday_values integer[],
  published_value boolean
) returns void
language plpgsql security definer set search_path=''
as $$
declare
  actor public.user_profiles;
  changed integer;
  normalised_weekdays integer[];
  current_journey public.group_learning_journeys;
  replacement_template public.learning_journey_templates;
  replacement_uuid uuid;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role in ('teacher','administrator') and archived_at is null;
  if actor.id is null or not public.can_manage_class(class_uuid) then
    raise exception 'not_authorised' using errcode='42501';
  end if;
  select array_agg(distinct day order by day) into normalised_weekdays
  from unnest(coalesce(weekday_values,'{}'::integer[])) day;
  if length(trim(name_value))<2 or cardinality(unit_uuids)<1
    or normalised_weekdays is null or cardinality(normalised_weekdays)<1
    or exists(select 1 from unnest(normalised_weekdays) day where day not between 1 and 7)
    or ends_value<starts_value then
    raise exception 'invalid_class_configuration' using errcode='22023';
  end if;
  if not exists(select 1 from public.courses c where c.id=course_uuid
      and c.organisation_id=actor.organisation_id and c.archived_at is null and c.active)
    or exists(select 1 from unnest(unit_uuids) selected(id)
      left join public.units u on u.id=selected.id and u.course_id=course_uuid
        and u.archived_at is null
      where u.id is null)
    or active_unit_uuid<>all(unit_uuids)
    or not exists(select 1 from public.academic_periods ap
      join public.academic_years ay on ay.id=ap.academic_year_id
      where ap.id=period_uuid and ay.organisation_id=actor.organisation_id
        and ap.archived_at is null) then
    raise exception 'invalid_curriculum' using errcode='22023';
  end if;

  select * into current_journey from public.group_learning_journeys
  where class_id=class_uuid and status='active' and archived_at is null
  order by started_at desc limit 1 for update;

  if current_journey.id is not null and current_journey.unit_id<>active_unit_uuid then
    if exists(select 1 from public.enrolments enrolment
      where enrolment.class_id=class_uuid and enrolment.archived_at is null) then
      raise exception 'active_journey_has_learners' using errcode='55000';
    end if;
    select * into replacement_template from public.learning_journey_templates template
    where template.unit_id=active_unit_uuid and template.status='approved'
      and template.archived_at is null
    order by template.version_number desc,template.approved_at desc nulls last
    limit 1;
    if replacement_template.id is null then
      raise exception 'journey_not_available' using errcode='22023';
    end if;
  end if;

  update public.classes set name=trim(name_value),academic_period_id=period_uuid,
    course_id=course_uuid,active_unit_id=active_unit_uuid,starts_on=starts_value,
    ends_on=ends_value,weekly_learning_days=normalised_weekdays,
    weekly_learning_day=normalised_weekdays[1],published=published_value
  where id=class_uuid;
  get diagnostics changed=row_count;
  if changed<>1 then raise exception 'class_not_available' using errcode='42501'; end if;

  update public.class_units set archived_at=now(),active=false
    where class_id=class_uuid and unit_id<>all(unit_uuids);
  insert into public.class_units(class_id,unit_id,active,selected_by,archived_at)
    select class_uuid,id,true,actor.id,null from unnest(unit_uuids) selected(id)
  on conflict(class_id,unit_id) do update set
    active=true,selected_by=actor.id,selected_at=now(),archived_at=null;

  if current_journey.id is not null and current_journey.unit_id<>active_unit_uuid then
    update public.group_learning_journeys set
      status='cancelled',archived_at=now(),
      settings=settings||jsonb_build_object(
        'replacement_reason','active_unit_corrected_before_enrolment',
        'replacement_unit_id',active_unit_uuid
      )
    where id=current_journey.id;

    insert into public.group_learning_journeys(
      class_id,template_id,unit_id,started_on,started_by,settings
    ) values(
      class_uuid,replacement_template.id,replacement_template.unit_id,
      current_journey.started_on,actor.id,
      jsonb_build_object(
        'start_mode','active_unit_corrected_before_enrolment',
        'replaced_journey_id',current_journey.id
      )
    ) returning id into replacement_uuid;

    insert into public.audit_logs(
      organisation_id,actor_id,action,entity_type,entity_id,after_data
    ) values(
      actor.organisation_id,actor.id,'group_journey.retargeted',
      'group_learning_journey',replacement_uuid,
      jsonb_build_object(
        'class_id',class_uuid,
        'previous_journey_id',current_journey.id,
        'previous_unit_id',current_journey.unit_id,
        'unit_id',active_unit_uuid,
        'template_id',replacement_template.id,
        'started_on',current_journey.started_on
      )
    );
  end if;

  insert into public.class_teachers(class_id,teacher_id,is_lead)
  values(class_uuid,actor.id,true)
  on conflict(class_id,teacher_id) do update set archived_at=null;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'class.configured','class',class_uuid,
    jsonb_build_object('course_id',course_uuid,'unit_ids',unit_uuids,
      'active_unit_id',active_unit_uuid,'weekly_learning_days',normalised_weekdays,
      'published',published_value));
end $$;

revoke all on function public.teacher_configure_class(uuid,text,uuid,uuid,uuid[],uuid,date,date,integer[],boolean) from public;
grant execute on function public.teacher_configure_class(uuid,text,uuid,uuid,uuid[],uuid,date,date,integer[],boolean) to authenticated;

comment on function public.teacher_configure_class(uuid,text,uuid,uuid,uuid[],uuid,date,date,integer[],boolean) is
  'Teacher-owned group configuration. An empty group journey follows a corrected active unit while a journey with active learners is protected.';
