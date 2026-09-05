do $$
declare
  year_uuid uuid := '20000000-0000-0000-0000-000000000001';
begin
  if (select count(*) from public.academic_calendar_events
      where academic_year_id=year_uuid
        and archived_at is null
        and kind in ('holiday','college_closure')) <> 10 then
    raise exception 'The organisation calendar must contain the ten approved 2026/27 non-teaching periods';
  end if;

  if not exists(
    select 1 from public.academic_calendar_events
    where academic_year_id=year_uuid
      and title='Autumn half term'
      and starts_on='2026-10-26' and ends_on='2026-10-30'
      and metadata->>'teacher_action_required'='false'
  ) then
    raise exception 'Autumn half term was not preloaded as an organisation-managed date';
  end if;

  if not exists(
    select 1 from public.academic_calendar_events
    where academic_year_id=year_uuid
      and title='Christmas holiday'
      and starts_on='2026-12-21' and ends_on='2027-01-01'
  ) then
    raise exception 'Christmas holiday was not preloaded';
  end if;

  if not exists(
    select 1 from public.academic_calendar_events
    where academic_year_id=year_uuid
      and title='Summer half term'
      and starts_on='2027-05-31' and ends_on='2027-06-04'
  ) then
    raise exception 'Summer half term was not preloaded';
  end if;

  if not exists(
    select 1 from public.academic_calendar_events
    where academic_year_id=year_uuid
      and title='Summer term-end closure'
      and starts_on='2027-06-26' and ends_on='2027-07-31'
  ) then
    raise exception 'The post-term period and 28 June staff CPD day were not protected';
  end if;
end $$;
