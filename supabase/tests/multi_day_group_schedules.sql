\set ON_ERROR_STOP on

begin;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;

select public.teacher_configure_class(
  'a0000000-0000-0000-0000-000000000001',
  'Tuesday and Friday group',
  '21000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  array['40000000-0000-0000-0000-000000000004'::uuid],
  '40000000-0000-0000-0000-000000000004',
  '2026-09-01','2027-07-01',array[5,2,2],true
);

reset role;

do $$
begin
  if (select weekly_learning_days from public.classes
      where id='a0000000-0000-0000-0000-000000000001')<>array[2,5]
    or (select weekly_learning_day from public.classes
      where id='a0000000-0000-0000-0000-000000000001')<>2 then
    raise exception 'multi-day schedule was not normalised with the earliest journey anchor';
  end if;
  if not exists(select 1 from public.audit_logs
      where action='class.configured'
        and after_data->'weekly_learning_days'='[2, 5]'::jsonb) then
    raise exception 'multi-day class configuration was not audited';
  end if;
end $$;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;

do $$
begin
  begin
    perform public.teacher_configure_class(
      'a0000000-0000-0000-0000-000000000001','Invalid schedule',
      '21000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000001',
      array['40000000-0000-0000-0000-000000000004'::uuid],
      '40000000-0000-0000-0000-000000000004',
      '2026-09-01','2027-07-01',array[2,8],true
    );
    raise exception 'an invalid ISO weekday was accepted';
  exception when sqlstate '22023' then
    null;
  end;

  perform public.teacher_configure_class(
    'a0000000-0000-0000-0000-000000000001','Legacy Thursday group',
    '21000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    array['40000000-0000-0000-0000-000000000004'::uuid],
    '40000000-0000-0000-0000-000000000004',
    '2026-09-01','2027-07-01',4,true
  );
end $$;

reset role;

do $$
begin
  if (select weekly_learning_days from public.classes
      where id='a0000000-0000-0000-0000-000000000001')<>array[4]
    or (select weekly_learning_day from public.classes
      where id='a0000000-0000-0000-0000-000000000001')<>4 then
    raise exception 'legacy single-day configuration did not retain compatible semantics';
  end if;
end $$;

rollback;
