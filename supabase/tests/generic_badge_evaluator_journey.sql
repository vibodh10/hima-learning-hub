\set ON_ERROR_STOP on

update public.badge_definitions
set criteria='{"separate_practice_days":1}'::jsonb
where code='consistent-learner';

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set role authenticated;

create temporary table badge_attempt_ids(id uuid);
grant select,insert on badge_attempt_ids to authenticated;
insert into badge_attempt_ids
select (public.submit_activity(
  '70000000-0000-0000-0000-000000000001',
  '{
    "80000000-0000-0000-0000-000000000001":"Firewall",
    "80000000-0000-0000-0000-000000000002":"true",
    "80000000-0000-0000-0000-000000000003":"depth",
    "80000000-0000-0000-0000-000000000004":["Separate network segment","Firewall rules"],
    "80000000-0000-0000-0000-000000000005":"80"
  }'::jsonb,0
)->>'attemptId')::uuid;

select public.evaluate_attempt_badges((select id from badge_attempt_ids));
select public.evaluate_attempt_badges((select id from badge_attempt_ids));
reset role;

insert into public.learner_routes(
  learner_id,topic_id,route,status,selected_by,evidence
) values(
  '90000000-0000-0000-0000-000000000002',
  '50000000-0000-0000-0000-000000000001',
  'Fast-Tracked','active','auto','{"test":true}'::jsonb
);

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set role authenticated;
select public.evaluate_attempt_badges((select id from badge_attempt_ids));
reset role;

do $$
begin
  if not exists(
    select 1 from public.badge_awards ba
    join public.badge_definitions bd on bd.id=ba.badge_id
    where ba.learner_id='90000000-0000-0000-0000-000000000002'
      and bd.code='consistent-learner'
  ) then raise exception 'configurable consistent-learner badge was not awarded'; end if;

  if not exists(
    select 1 from public.badge_awards ba
    join public.badge_definitions bd on bd.id=ba.badge_id
    where ba.learner_id='90000000-0000-0000-0000-000000000002'
      and bd.code='fast-track-achieved'
  ) then raise exception 'fast-track evidence badge was not awarded'; end if;

  if exists(
    select badge_id from public.badge_awards
    where learner_id='90000000-0000-0000-0000-000000000002'
    group by badge_id having count(*)>1
  ) then raise exception 'one-time badge was awarded repeatedly'; end if;
end $$;

