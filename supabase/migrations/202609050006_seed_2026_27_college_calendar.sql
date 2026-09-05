-- Organisation-wide non-teaching dates for 2026/27. These dates come from
-- the SCCB term dates supplied by the administrator. Teachers must not
-- maintain holiday dates per group.

create or replace function public.sync_2026_27_college_calendar(year_uuid uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  insert into public.academic_calendar_events(
    academic_year_id,academic_period_id,title,kind,starts_on,ends_on,metadata
  )
  select
    academic_year.id,null,calendar_dates.title,calendar_dates.kind,
    calendar_dates.starts_on,calendar_dates.ends_on,
    jsonb_build_object(
      'source',calendar_dates.source_reference,
      'managed_scope','organisation',
      'teacher_action_required',false
    )
  from public.academic_years academic_year
  cross join (
    values
      ('Autumn staff development day','college_closure','2026-10-23'::date,'2026-10-23'::date,'SCCB term dates supplied 2026-09-05'),
      ('Autumn half term','holiday','2026-10-26'::date,'2026-10-30'::date,'SCCB term dates supplied 2026-09-05'),
      ('Autumn term-end closure','college_closure','2026-12-17'::date,'2026-12-20'::date,'SCCB term dates supplied 2026-09-05'),
      ('Christmas holiday','holiday','2026-12-21'::date,'2027-01-01'::date,'SCCB term dates supplied 2026-09-05'),
      ('Spring half term','holiday','2027-02-15'::date,'2027-02-19'::date,'SCCB term dates supplied 2026-09-05'),
      ('Spring staff development and term-end closure','college_closure','2027-03-25'::date,'2027-03-29'::date,'SCCB term dates supplied 2026-09-05'),
      ('Easter holiday','holiday','2027-03-30'::date,'2027-04-09'::date,'SCCB term dates supplied 2026-09-05'),
      ('Early May bank holiday','holiday','2027-05-03'::date,'2027-05-03'::date,'SCCB assessment plan and UK bank holiday 2026/27'),
      ('Summer half term','holiday','2027-05-31'::date,'2027-06-04'::date,'SCCB term dates supplied 2026-09-05'),
      ('Summer term-end closure','college_closure','2027-06-26'::date,'2027-07-31'::date,'SCCB term dates supplied 2026-09-05; includes staff CPD on 2027-06-28')
  ) as calendar_dates(title,kind,starts_on,ends_on,source_reference)
  where academic_year.id=year_uuid
    and academic_year.name='2026/27'
    and academic_year.archived_at is null
    and not exists(
      select 1 from public.academic_calendar_events existing
      where existing.academic_year_id=academic_year.id
        and existing.archived_at is null
        and existing.title=calendar_dates.title
        and existing.starts_on=calendar_dates.starts_on
        and existing.ends_on=calendar_dates.ends_on
    );
end;
$$;

create or replace function public.sync_2026_27_college_calendar_after_year_write()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.name='2026/27' and new.archived_at is null then
    perform public.sync_2026_27_college_calendar(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists academic_year_sync_2026_27_calendar on public.academic_years;
create trigger academic_year_sync_2026_27_calendar
after insert or update of name,archived_at on public.academic_years
for each row execute function public.sync_2026_27_college_calendar_after_year_write();

do $$
declare year_record record;
begin
  for year_record in
    select id from public.academic_years where name='2026/27' and archived_at is null
  loop
    perform public.sync_2026_27_college_calendar(year_record.id);
  end loop;
end $$;

revoke all on function public.sync_2026_27_college_calendar(uuid) from public,anon,authenticated;
revoke all on function public.sync_2026_27_college_calendar_after_year_write() from public,anon,authenticated;
