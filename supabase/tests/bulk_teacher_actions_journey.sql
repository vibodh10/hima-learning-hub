\set ON_ERROR_STOP on

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set role authenticated;
select public.teacher_record_bulk_action(
  'a0000000-0000-0000-0000-000000000001',
  array['90000000-0000-0000-0000-000000000002'::uuid],
  'additional practice allocated',
  'Starting-point evidence identifies a need for more independent conversion practice.',
  current_date+7,
  'Adaptive Core practice allocated.'
);
reset role;

do $$
begin
  if not exists(select 1 from public.teacher_actions
    where learner_id='90000000-0000-0000-0000-000000000002'
      and class_id='a0000000-0000-0000-0000-000000000001'
      and action='additional practice allocated'
      and metadata->>'bulk'='true') then
    raise exception 'bulk teacher action was not stored';
  end if;
  if not exists(select 1 from public.audit_logs
    where action='teacher_action.bulk_recorded'
      and after_data->>'count'='1') then
    raise exception 'bulk teacher action audit evidence is missing';
  end if;
end $$;

