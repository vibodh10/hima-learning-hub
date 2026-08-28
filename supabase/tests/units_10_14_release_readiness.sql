begin;

do $$
declare
  unit_code_value text;
  template_count integer;
  week_count integer;
  configured_count integer;
begin
  foreach unit_code_value in array array['10','14'] loop
    select count(*) into template_count
    from public.learning_journey_templates template
    join public.units unit on unit.id=template.unit_id
    where unit.code=unit_code_value and template.status='approved' and template.archived_at is null;
    if template_count=0 then
      raise exception 'Unit % has no approved automatic journey',unit_code_value;
    end if;

    select count(*),count(*) filter(where journey_week.configuration->>'topic_code' is not null)
      into week_count,configured_count
    from public.learning_journey_weeks journey_week
    join public.learning_journey_templates template on template.id=journey_week.template_id
    join public.units unit on unit.id=template.unit_id
    where unit.code=unit_code_value and template.status='approved'
      and template.archived_at is null;
    if week_count<>12 or configured_count<>12 then
      raise exception 'Unit % journey expected 12 configured weeks, got %/%',unit_code_value,week_count,configured_count;
    end if;
  end loop;

  if exists(
    select 1 from public.learning_journey_weeks journey_week
    join public.learning_journey_templates template on template.id=journey_week.template_id
    join public.units unit on unit.id=template.unit_id
    where unit.code='14' and journey_week.configuration->>'assessment_context'<>'external_set_task_preparation'
  ) then
    raise exception 'Unit 14 must remain labelled as external set-task preparation';
  end if;
end;
$$;

rollback;
