-- One-time completion context for time, confidence and starting-point profile.

create or replace function public.record_attempt_context(
  attempt_uuid uuid,active_seconds_value integer,confidence_before_value integer,
  confidence_after_value integer,prior_experience_value jsonb,
  support_needs_value text,aspirations_value text
) returns void language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; assessment_uuid uuid; changed integer;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role='student' and archived_at is null;
  if actor.id is null or active_seconds_value not between 1 and 21600
    or confidence_before_value not between 1 and 5
    or confidence_after_value not between 1 and 5 then
    raise exception 'invalid_attempt_context' using errcode='22023';
  end if;
  update public.attempts set
    active_seconds=active_seconds_value,confidence_rating=confidence_after_value
  where id=attempt_uuid and learner_id=actor.id and completed_at is not null
    and active_seconds is null and confidence_rating is null;
  get diagnostics changed=row_count;
  if changed<>1 then raise exception 'attempt_context_not_available' using errcode='42501'; end if;
  select id into assessment_uuid from public.assessment_instances
    where attempt_id=attempt_uuid and learner_id=actor.id;
  if assessment_uuid is not null then
    update public.assessment_instances set
      confidence_before=confidence_before_value,
      confidence_after=confidence_after_value,
      prior_experience=coalesce(prior_experience_value,'{}'),
      support_needs=nullif(trim(support_needs_value),''),
      aspirations=nullif(trim(aspirations_value),'')
    where id=assessment_uuid;
    update public.assessment_skill_results set active_seconds=active_seconds_value
      where assessment_instance_id=assessment_uuid;
  end if;
end $$;

revoke all on function public.record_attempt_context(uuid,integer,integer,integer,jsonb,text,text) from public;
grant execute on function public.record_attempt_context(uuid,integer,integer,integer,jsonb,text,text) to authenticated;
