alter table public.academic_calendar_events
  add column if not exists created_by uuid references public.user_profiles(id),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists archived_at timestamptz;

create or replace function public.teacher_save_calendar_event(
  event_uuid uuid,
  academic_year_uuid uuid,
  academic_period_uuid uuid,
  title_value text,
  kind_value text,
  starts_value date,
  ends_value date,
  metadata_value jsonb default '{}'::jsonb,
  archive_value boolean default false
) returns uuid
language plpgsql security definer set search_path=public
as $$
declare
  actor public.user_profiles;
  saved_uuid uuid;
  year_organisation uuid;
begin
  actor:=public.current_profile();
  select organisation_id into year_organisation
  from public.academic_years
  where id=academic_year_uuid and archived_at is null;

  if actor.id is null or actor.role not in ('teacher','administrator')
    or year_organisation is distinct from actor.organisation_id then
    raise exception 'calendar_access_denied' using errcode='42501';
  end if;
  if length(trim(title_value))<3
    or kind_value not in ('holiday','teaching_week','progress_point_week','review_week','examination_reminder')
    or ends_value<starts_value
    or (academic_period_uuid is not null and not exists(
      select 1 from public.academic_periods
      where id=academic_period_uuid and academic_year_id=academic_year_uuid
        and archived_at is null
    )) then
    raise exception 'invalid_calendar_event' using errcode='22023';
  end if;

  if event_uuid is null then
    insert into public.academic_calendar_events(
      academic_year_id,academic_period_id,title,kind,starts_on,ends_on,
      metadata,created_by,archived_at
    ) values(
      academic_year_uuid,academic_period_uuid,trim(title_value),kind_value,
      starts_value,ends_value,coalesce(metadata_value,'{}'),actor.id,
      case when archive_value then now() else null end
    ) returning id into saved_uuid;
  else
    update public.academic_calendar_events set
      academic_year_id=academic_year_uuid,
      academic_period_id=academic_period_uuid,
      title=trim(title_value),kind=kind_value,starts_on=starts_value,
      ends_on=ends_value,metadata=coalesce(metadata_value,'{}'),
      updated_at=now(),
      archived_at=case when archive_value then coalesce(archived_at,now()) else null end
    where id=event_uuid
      and academic_year_id in (
        select id from public.academic_years
        where organisation_id=actor.organisation_id
      )
    returning id into saved_uuid;
    if saved_uuid is null then
      raise exception 'calendar_event_not_found' using errcode='42501';
    end if;
  end if;

  insert into public.audit_logs(
    organisation_id,actor_id,action,entity_type,entity_id,after_data
  ) values(
    actor.organisation_id,actor.id,
    case when archive_value then 'calendar_event.archived'
      when event_uuid is null then 'calendar_event.created'
      else 'calendar_event.updated' end,
    'academic_calendar_event',saved_uuid,
    jsonb_build_object('title',trim(title_value),'kind',kind_value,
      'starts_on',starts_value,'ends_on',ends_value)
  );
  return saved_uuid;
end;
$$;

drop policy if exists academic_calendar_read on public.academic_calendar_events;
create policy academic_calendar_read on public.academic_calendar_events for select using (
  archived_at is null and exists(
    select 1 from public.academic_years ay
    where ay.id=academic_year_id
      and ay.organisation_id=(select organisation_id from public.current_profile())
  )
);

revoke all on function public.teacher_save_calendar_event(uuid,uuid,uuid,text,text,date,date,jsonb,boolean) from public;
grant execute on function public.teacher_save_calendar_event(uuid,uuid,uuid,text,text,date,date,jsonb,boolean) to authenticated;
