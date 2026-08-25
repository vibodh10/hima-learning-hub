\set ON_ERROR_STOP on

update public.user_profiles set role='administrator'
where id='90000000-0000-0000-0000-000000000001';
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set role authenticated;

create temporary table calendar_ids(id uuid);
grant select,insert on calendar_ids to authenticated;
insert into calendar_ids
select public.teacher_save_calendar_event(
  null,'20000000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000001',
  'Autumn progress checkpoint','progress_point_week',
  '2026-10-12','2026-10-16','{"note":"Complete the equivalent formative review."}',false
);

select public.teacher_save_calendar_event(
  (select id from calendar_ids),
  '20000000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000001',
  'Autumn progress and review checkpoint','review_week',
  '2026-10-12','2026-10-16','{"note":"Review progress with your teacher."}',false
);

reset role;

do $$
begin
  if not exists(
    select 1 from public.academic_calendar_events
    where id=(select id from calendar_ids)
      and title='Autumn progress and review checkpoint'
      and kind='review_week' and archived_at is null
  ) then raise exception 'calendar create/update failed'; end if;
  if (select count(*) from public.audit_logs
    where entity_id=(select id from calendar_ids)
      and action in ('calendar_event.created','calendar_event.updated'))<>2
  then raise exception 'calendar audit evidence failed'; end if;
end $$;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set role authenticated;
select public.teacher_save_calendar_event(
  (select id from calendar_ids),
  '20000000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000001',
  'Autumn progress and review checkpoint','review_week',
  '2026-10-12','2026-10-16','{}',true
);
reset role;

do $$
begin
  if not exists(select 1 from public.academic_calendar_events
    where id=(select id from calendar_ids) and archived_at is not null)
  then raise exception 'calendar archive failed'; end if;
  if not exists(select 1 from public.audit_logs
    where entity_id=(select id from calendar_ids)
      and action='calendar_event.archived')
  then raise exception 'calendar archive audit failed'; end if;
end $$;
