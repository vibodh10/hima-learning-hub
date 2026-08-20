\set ON_ERROR_STOP on
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set role authenticated;
select public.teacher_set_pathway_thresholds(
  'a0000000-0000-0000-0000-000000000001',
  59,74,89,5,2,2,15
);
reset role;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set role authenticated;
do $$
begin
  if public.pathway_for(59,0)<>'Support' then raise exception 'custom Support threshold failed'; end if;
  if public.pathway_for(60,0)<>'Core' then raise exception 'custom Core threshold failed'; end if;
  if public.pathway_for(75,0)<>'Stretch' then raise exception 'custom Stretch threshold failed'; end if;
  if public.pathway_for(90,0)<>'Mastery' then raise exception 'custom Mastery threshold failed'; end if;
  if public.pathway_for(100,6)<>'Stretch' then raise exception 'custom hint weighting failed'; end if;
end $$;
reset role;
