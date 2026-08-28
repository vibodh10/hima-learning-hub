-- A cohort can meet on several regular days while its teaching journey still
-- advances once per teaching week. The earliest configured day remains the
-- backward-compatible journey anchor in weekly_learning_day.

alter table public.classes
  add column if not exists weekly_learning_days integer[];

update public.classes
set weekly_learning_days=array[weekly_learning_day]
where weekly_learning_days is null and weekly_learning_day is not null;

create or replace function public.normalise_class_weekly_schedule()
returns trigger language plpgsql set search_path=''
as $$
declare normalised integer[];
begin
  if tg_op='UPDATE'
    and new.weekly_learning_days is not distinct from old.weekly_learning_days
    and new.weekly_learning_day is distinct from old.weekly_learning_day then
    new.weekly_learning_days:=case when new.weekly_learning_day is null
      then null else array[new.weekly_learning_day] end;
  elsif new.weekly_learning_days is not null then
    select array_agg(distinct day order by day) into normalised
    from unnest(new.weekly_learning_days) day;
    if normalised is null or cardinality(normalised)<1
      or exists(select 1 from unnest(normalised) day where day not between 1 and 7) then
      raise exception 'invalid_weekly_learning_days' using errcode='22023';
    end if;
    new.weekly_learning_days:=normalised;
    new.weekly_learning_day:=normalised[1];
  elsif new.weekly_learning_day is not null then
    new.weekly_learning_days:=array[new.weekly_learning_day];
  end if;
  return new;
end $$;

drop trigger if exists classes_normalise_weekly_schedule on public.classes;
create trigger classes_normalise_weekly_schedule
before insert or update of weekly_learning_day,weekly_learning_days on public.classes
for each row execute function public.normalise_class_weekly_schedule();

alter table public.classes
  drop constraint if exists classes_weekly_learning_days_check;
alter table public.classes
  add constraint classes_weekly_learning_days_check check(
    weekly_learning_days is null or (
      cardinality(weekly_learning_days) between 1 and 7
      and weekly_learning_days <@ array[1,2,3,4,5,6,7]
    )
  );

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
declare actor public.user_profiles; changed integer; normalised_weekdays integer[];
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

  insert into public.class_teachers(class_id,teacher_id,is_lead)
  values(class_uuid,actor.id,true)
  on conflict(class_id,teacher_id) do update set archived_at=null;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'class.configured','class',class_uuid,
    jsonb_build_object('course_id',course_uuid,'unit_ids',unit_uuids,
      'active_unit_id',active_unit_uuid,'weekly_learning_days',normalised_weekdays,
      'published',published_value));
end $$;

-- Preserve the original single-day signature for older clients.
create or replace function public.teacher_configure_class(
  class_uuid uuid,
  name_value text,
  period_uuid uuid,
  course_uuid uuid,
  unit_uuids uuid[],
  active_unit_uuid uuid,
  starts_value date,
  ends_value date,
  weekday_value integer,
  published_value boolean
) returns void
language plpgsql security definer set search_path=''
as $$
begin
  perform public.teacher_configure_class(
    class_uuid,name_value,period_uuid,course_uuid,unit_uuids,active_unit_uuid,
    starts_value,ends_value,array[weekday_value],published_value
  );
end $$;

revoke all on function public.teacher_configure_class(uuid,text,uuid,uuid,uuid[],uuid,date,date,integer[],boolean) from public;
grant execute on function public.teacher_configure_class(uuid,text,uuid,uuid,uuid[],uuid,date,date,integer[],boolean) to authenticated;

comment on column public.classes.weekly_learning_days is
  'All regular ISO teaching weekdays. weekly_learning_day stores the earliest day as the once-per-week journey anchor.';
comment on function public.teacher_configure_class(uuid,text,uuid,uuid,uuid[],uuid,date,date,integer[],boolean) is
  'Teacher-owned multi-day group configuration with organisation, curriculum and class-management authorization.';
