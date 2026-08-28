\set ON_ERROR_STOP on

begin;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set role authenticated;

select public.record_learner_activity_position(
  '61000000-0000-0000-0000-000000000001',
  '71000000-0000-0000-0000-000000000001'
);

do $$
begin
  if not exists(
    select 1 from public.learner_activity_positions
    where learner_id='90000000-0000-0000-0000-000000000002'
      and lesson_id='61000000-0000-0000-0000-000000000001'
      and activity_id='71000000-0000-0000-0000-000000000001'
      and last_opened_at is not null
  ) then
    raise exception 'the learner activity position was not stored';
  end if;

  begin
    insert into public.learner_activity_positions(learner_id,lesson_id,activity_id)
    values(
      '90000000-0000-0000-0000-000000000002',
      '61000000-0000-0000-0000-000000000001',
      '71000000-0000-0000-0000-000000000002'
    );
    raise exception 'the browser role wrote navigation state directly';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.record_learner_activity_position(
      '61000000-0000-0000-0000-000000000002',
      '71000000-0000-0000-0000-000000000001'
    );
    raise exception 'a mismatched lesson and activity were accepted';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set role authenticated;

do $$
begin
  begin
    perform public.record_learner_activity_position(
      '61000000-0000-0000-0000-000000000001',
      '71000000-0000-0000-0000-000000000001'
    );
    raise exception 'a staff account recorded a learner navigation position';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

do $$
begin
  if has_table_privilege('authenticated','public.learner_activity_positions','INSERT')
    or has_table_privilege('authenticated','public.learner_activity_positions','UPDATE')
    or has_table_privilege('authenticated','public.learner_activity_positions','DELETE') then
    raise exception 'authenticated clients have direct mutation rights on activity positions';
  end if;
  if not (
    select prosecdef and proconfig @> array['search_path=""']
    from pg_proc
    where oid='public.record_learner_activity_position(uuid,uuid)'::regprocedure
  ) then
    raise exception 'the activity-position function is not hardened';
  end if;
end $$;

rollback;
