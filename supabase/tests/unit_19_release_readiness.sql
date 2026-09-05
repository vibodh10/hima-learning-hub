begin;

do $$
declare
  template_count integer;
  week_count integer;
  configured_count integer;
begin
  select count(*) into template_count
  from public.learning_journey_templates template
  join public.units unit on unit.id=template.unit_id
  where unit.code='19' and template.status='approved' and template.archived_at is null;
  if template_count<>1 then
    raise exception 'Unit 19 expected one approved automatic journey, got %',template_count;
  end if;

  select count(*),count(*) filter(where journey_week.configuration->>'topic_code' is not null)
    into week_count,configured_count
  from public.learning_journey_weeks journey_week
  join public.learning_journey_templates template on template.id=journey_week.template_id
  join public.units unit on unit.id=template.unit_id
  where unit.code='19' and template.status='approved' and template.archived_at is null;
  if week_count<>12 or configured_count<>12 then
    raise exception 'Unit 19 journey expected 12 configured weeks, got %/%',week_count,configured_count;
  end if;

  if exists(
    select 1 from public.learning_journey_weeks journey_week
    join public.learning_journey_templates template on template.id=journey_week.template_id
    join public.units unit on unit.id=template.unit_id
    where unit.code='19'
      and journey_week.configuration->>'assessment_context'<>'internal_assessment_evidence'
  ) then
    raise exception 'Unit 19 must remain labelled as internal assessment evidence';
  end if;

  if pg_get_constraintdef((
    select oid from pg_constraint
    where conrelid='public.learner_curriculum_attempts'::regclass
      and conname='learner_curriculum_attempts_unit_code_check'
  )) not like '%19%' then
    raise exception 'Unit 19 curriculum attempts are not permitted by the database contract';
  end if;

  if pg_get_functiondef('public.submit_my_topic_worksheet(text,text,text,text,jsonb,integer)'::regprocedure)
    not like '%''19''%' then
    raise exception 'Unit 19 worksheets are not permitted by the database function';
  end if;
end;
$$;

rollback;
