\set ON_ERROR_STOP on
begin;
select public.seed_shared_progress_units();
do $$ declare code_value text; begin
  foreach code_value in array array['5','11','16'] loop
    if not exists(select 1 from public.learning_journey_templates t join public.units u on u.id=t.unit_id where u.code=code_value and t.status='approved' and t.archived_at is null) then raise exception 'missing ready template for %',code_value; end if;
    if (select count(*) from public.learning_journey_weeks w join public.learning_journey_templates t on t.id=w.template_id join public.units u on u.id=t.unit_id where u.code=code_value and t.status='approved' and w.configuration->>'resource_kind'='configured_topic_hub')<>12 then raise exception 'missing mapped topics for %',code_value; end if;
  end loop;
end $$;
rollback;
