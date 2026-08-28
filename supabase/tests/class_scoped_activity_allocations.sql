\set ON_ERROR_STOP on

begin;

update public.user_profiles set role='administrator'
where id='90000000-0000-0000-0000-000000000001';

-- Keep this journey's completion count isolated from any historical fixtures.
update public.activity_allocations set archived_at=now()
where class_id='a0000000-0000-0000-0000-000000000001'
  and archived_at is null;

create temporary table allocation_scope_result(payload jsonb);
create temporary table allocation_scope_ids(
  allocation_id uuid primary key,activity_id uuid not null
);
grant select,insert on allocation_scope_result,allocation_scope_ids
  to authenticated;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;

insert into allocation_scope_result
select public.teacher_allocate_adaptive_homework(
  '51000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000002',
  'Core',now(),now()+interval '7 days',15,true
);

insert into allocation_scope_ids
select (item->>'allocationId')::uuid,(item->>'activityId')::uuid
from allocation_scope_result result
cross join lateral jsonb_array_elements(result.payload->'allocations') item;

do $$
declare attention record;
begin
  if (select count(*) from allocation_scope_ids)<>1 then
    raise exception 'expected one personalised allocation';
  end if;
  if not exists(
    select 1 from public.activity_allocations allocation
    join allocation_scope_ids expected on expected.allocation_id=allocation.id
    where allocation.class_id='a0000000-0000-0000-0000-000000000001'
      and allocation.learner_id='90000000-0000-0000-0000-000000000002'
      and allocation.class_scope_source='explicit'
  ) then
    raise exception 'personalised allocation lost its exact class scope';
  end if;
  select * into attention from public.class_learner_attention(
    'a0000000-0000-0000-0000-000000000001'
  ) where learner_id='90000000-0000-0000-0000-000000000002';
  if attention.outstanding_count<>1 then
    raise exception 'released required allocation was not counted exactly: %',
      row_to_json(attention);
  end if;
  if has_table_privilege('authenticated','public.activity_allocations','INSERT')
    or has_table_privilege('authenticated','public.activity_allocations','UPDATE')
    or has_table_privilege('authenticated','public.activity_allocations','DELETE') then
    raise exception 'authenticated still has direct allocation mutation privileges';
  end if;
  begin
    insert into public.activity_allocations(
      activity_id,class_id,learner_id,allocated_pathway,required,allocated_by
    ) select activity_id,'a0000000-0000-0000-0000-000000000001',
      '90000000-0000-0000-0000-000000000002','Core',true,
      '90000000-0000-0000-0000-000000000001'
    from allocation_scope_ids;
    raise exception 'direct authenticated allocation insert unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

-- A manageable class with the same structure still cannot be used to allocate
-- work to a learner who is not enrolled in that exact class.
do $$
declare duplicate_uuid uuid;
begin
  duplicate_uuid:=public.teacher_duplicate_class(
    'a0000000-0000-0000-0000-000000000001',
    'Allocation Scope Check','SCOPE-26'
  );
  begin
    perform public.teacher_allocate_adaptive_homework(
      '51000000-0000-0000-0000-000000000001',duplicate_uuid,
      '90000000-0000-0000-0000-000000000002','Core',
      now(),now()+interval '7 days',15,true
    );
    raise exception 'cross-class personalised allocation unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

select public.teacher_override_activity_lock(
  '90000000-0000-0000-0000-000000000002',
  (select activity_id from allocation_scope_ids),
  'Exact allocation completion contract test',null
);

reset role;

create temporary table allocation_scope_answers(payload jsonb);
insert into allocation_scope_answers
select coalesce(jsonb_object_agg(question.id::text,question.correct_answer),'{}')
from allocation_scope_ids expected
join public.activity_questions link on link.activity_id=expected.activity_id
join public.questions question on question.id=link.question_id;
grant select on allocation_scope_answers to authenticated;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set local role authenticated;
select public.submit_activity(
  (select activity_id from allocation_scope_ids),
  (select payload from allocation_scope_answers),0
);
reset role;

do $$
begin
  if not exists(
    select 1 from public.attempts attempt
    join allocation_scope_ids expected
      on expected.allocation_id=attempt.allocation_id
      and expected.activity_id=attempt.activity_id
    where attempt.learner_id='90000000-0000-0000-0000-000000000002'
      and attempt.completed_at is not null
  ) then
    raise exception 'submission was not bound to its exact allocation';
  end if;
  if not exists(
    select 1 from public.targets target
    join public.attempts attempt
      on attempt.id=(target.evidence->>'attempt_id')::uuid
    join allocation_scope_ids expected
      on expected.allocation_id=attempt.allocation_id
    where target.learner_id='90000000-0000-0000-0000-000000000002'
      and target.class_id='a0000000-0000-0000-0000-000000000001'
  ) then
    raise exception 'automatic target did not inherit the allocation class';
  end if;
end $$;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
do $$
declare attention record;
begin
  select * into attention from public.class_learner_attention(
    'a0000000-0000-0000-0000-000000000001'
  ) where learner_id='90000000-0000-0000-0000-000000000002';
  if attention.outstanding_count<>0 then
    raise exception 'exact completed allocation remained outstanding: %',
      row_to_json(attention);
  end if;
end $$;
reset role;

-- Two further low attempts in the same module are genuine repeated evidence;
-- the priority list must describe that pattern rather than only the latest mark.
insert into public.attempts(
  learner_id,activity_id,attempt_number,completed_at,mark,max_mark,percentage,
  pathway,allocation_id
)
select
  '90000000-0000-0000-0000-000000000002',expected.activity_id,
  base.next_attempt+generated.offset_value,now()+generated.offset_value*interval '1 second',
  generated.mark_value,10,generated.mark_value*10,'Support',expected.allocation_id
from allocation_scope_ids expected
cross join lateral (
  select coalesce(max(attempt.attempt_number),0) as next_attempt
  from public.attempts attempt
  where attempt.learner_id='90000000-0000-0000-0000-000000000002'
    and attempt.activity_id=expected.activity_id
) base
cross join (values (1,3::numeric),(2,4::numeric))
  generated(offset_value,mark_value);

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
do $$
declare attention record;
begin
  select * into attention from public.class_learner_attention(
    'a0000000-0000-0000-0000-000000000001'
  ) where learner_id='90000000-0000-0000-0000-000000000002';
  if attention.attention_status<>'action_required'
    or attention.attention_reason not like '%latest three attempts%below 50%%' then
    raise exception 'repeated low module evidence was not surfaced: %',
      row_to_json(attention);
  end if;
end $$;
reset role;

rollback;
