\set ON_ERROR_STOP on
grant select on public.attempts to authenticated;
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set role authenticated;
do $$ begin
  perform public.submit_activity(
    '72000000-0000-0000-0000-000000000002',
    '{"81000000-0000-0000-0000-000000000025":"7","81000000-0000-0000-0000-000000000026":"str, int, float","81000000-0000-0000-0000-000000000027":"distance = float(input(\"Distance: \"))","81000000-0000-0000-0000-000000000028":"7.0","81000000-0000-0000-0000-000000000029":"logic error"}'::jsonb,
    0
  );
end $$;
select public.record_attempt_context(
  (select id from public.attempts
    where learner_id='90000000-0000-0000-0000-000000000002'
      and activity_id='72000000-0000-0000-0000-000000000002'
    order by completed_at desc limit 1),
  420,2,4,'{"summary":"Some prior Scratch experience"}',
  'Worked examples and chunked instructions help.',
  'Interested in software development.'
);
reset role;

do $$
begin
  if not exists(select 1 from public.attempts
      where learner_id='90000000-0000-0000-0000-000000000002'
        and active_seconds=420 and confidence_rating=4) then
    raise exception 'attempt time/confidence context was not stored';
  end if;
  if not exists(select 1 from public.assessment_instances
      where learner_id='90000000-0000-0000-0000-000000000002'
        and confidence_before=2 and confidence_after=4
        and support_needs is not null and aspirations is not null) then
    raise exception 'starting-point learner profile context was not stored';
  end if;
end $$;
