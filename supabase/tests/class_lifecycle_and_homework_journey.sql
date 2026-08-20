\set ON_ERROR_STOP on
grant select on public.classes to authenticated;
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set role authenticated;

create temporary table lifecycle_ids(label text primary key,id uuid);
grant select,insert on lifecycle_ids to authenticated;
insert into lifecycle_ids values(
  'duplicate',public.teacher_duplicate_class(
    'a0000000-0000-0000-0000-000000000001','Duplicated Structure','DUP-2026'
  )
);

select public.teacher_import_existing_students(
  (select id from public.classes where name='Group 1' and archived_at is null limit 1),
  array['learner@northbridge.example','missing@example.invalid'],
  'learners.csv'
);

select public.teacher_allocate_adaptive_homework(
  '51000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',null,'Auto',
  now(),now()+interval '7 days',15,true
);
reset role;

do $$
declare duplicate_uuid uuid:=(select id from lifecycle_ids where label='duplicate');
begin
  if (select count(*) from public.class_units where class_id=duplicate_uuid
      and archived_at is null)<>(select count(*) from public.class_units
      where class_id='a0000000-0000-0000-0000-000000000001' and archived_at is null) then
    raise exception 'class structure duplication failed';
  end if;
  if not exists(select 1 from public.student_import_batches
      where succeeded_count=1 and failed_count=1) then
    raise exception 'CSV-style student import did not preserve success/failure evidence';
  end if;
  if not exists(select 1 from public.activity_allocations
      where learner_id='90000000-0000-0000-0000-000000000002'
        and allocation_mode='auto' and expected_minutes=15 and required) then
    raise exception 'learner-specific adaptive homework allocation failed';
  end if;
  if not exists(select 1 from public.audit_logs
      where action='adaptive_homework.allocated') then
    raise exception 'adaptive homework audit evidence missing';
  end if;
end $$;
