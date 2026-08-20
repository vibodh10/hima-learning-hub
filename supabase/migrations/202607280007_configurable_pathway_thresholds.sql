create or replace function public.pathway_for(score numeric,hint_count integer default 0)
returns public.pathway language plpgsql stable security definer set search_path=''
as $$
declare
  actor public.user_profiles;
  thresholds public.pathway_thresholds;
  adjusted numeric;
begin
  select * into actor from public.user_profiles where id=auth.uid() and archived_at is null;
  if actor.id is not null then
    select pt.* into thresholds from public.pathway_thresholds pt
    where pt.organisation_id=actor.organisation_id and (
      pt.class_id is null or exists(select 1 from public.enrolments e
        where e.student_id=actor.id and e.class_id=pt.class_id and e.archived_at is null)
    ) order by (pt.class_id is not null) desc,pt.updated_at desc limit 1;
  end if;
  adjusted:=greatest(0,score-least(
    hint_count*coalesce(thresholds.hints_weight,4),20
  ));
  return case
    when adjusted<=coalesce(thresholds.support_max,49.99) then 'Support'::public.pathway
    when adjusted<=coalesce(thresholds.core_max,69.99) then 'Core'::public.pathway
    when adjusted<=coalesce(thresholds.stretch_max,84.99) then 'Stretch'::public.pathway
    else 'Mastery'::public.pathway end;
end $$;

create or replace function public.teacher_set_pathway_thresholds(
  class_uuid uuid,support_max_value numeric,core_max_value numeric,
  stretch_max_value numeric,hints_weight_value numeric,
  repeated_error_weight_value numeric,confidence_weight_value numeric,
  retention_weight_value numeric
) returns uuid language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; threshold_uuid uuid;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role in ('teacher','administrator') and archived_at is null;
  if actor.id is null or (class_uuid is not null and not public.can_manage_class(class_uuid))
    or support_max_value<0 or support_max_value>=core_max_value
    or core_max_value>=stretch_max_value or stretch_max_value>=100
    or hints_weight_value not between 0 and 20
    or repeated_error_weight_value not between 0 and 20
    or confidence_weight_value not between 0 and 20
    or retention_weight_value not between 0 and 50 then
    raise exception 'invalid_pathway_thresholds' using errcode='22023';
  end if;
  select id into threshold_uuid from public.pathway_thresholds
    where organisation_id=actor.organisation_id and class_id is not distinct from class_uuid;
  if threshold_uuid is null then
    insert into public.pathway_thresholds(
      organisation_id,class_id,support_max,core_max,stretch_max,hints_weight,
      repeated_error_weight,confidence_weight,retention_weight,updated_by
    ) values(
      actor.organisation_id,class_uuid,support_max_value,core_max_value,
      stretch_max_value,hints_weight_value,repeated_error_weight_value,
      confidence_weight_value,retention_weight_value,actor.id
    ) returning id into threshold_uuid;
  else
    update public.pathway_thresholds set
      support_max=support_max_value,core_max=core_max_value,
      stretch_max=stretch_max_value,hints_weight=hints_weight_value,
      repeated_error_weight=repeated_error_weight_value,
      confidence_weight=confidence_weight_value,
      retention_weight=retention_weight_value,updated_by=actor.id,updated_at=now()
    where id=threshold_uuid;
  end if;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'pathway_thresholds.updated',
    'pathway_threshold',threshold_uuid,jsonb_build_object(
      'class_id',class_uuid,'support_max',support_max_value,'core_max',core_max_value,
      'stretch_max',stretch_max_value,'hints_weight',hints_weight_value,
      'repeated_error_weight',repeated_error_weight_value,
      'confidence_weight',confidence_weight_value,'retention_weight',retention_weight_value
    ));
  return threshold_uuid;
end $$;

revoke all on function public.teacher_set_pathway_thresholds(uuid,numeric,numeric,numeric,numeric,numeric,numeric,numeric) from public;
grant execute on function public.teacher_set_pathway_thresholds(uuid,numeric,numeric,numeric,numeric,numeric,numeric,numeric) to authenticated;
