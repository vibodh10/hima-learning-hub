\set ON_ERROR_STOP on

begin;

insert into public.teacher_notes(learner_id,teacher_id,note)
values(
  '90000000-0000-0000-0000-000000000002',
  '90000000-0000-0000-0000-000000000001',
  'Historical note without a reliable class boundary.'
);

insert into public.classes(
  id,organisation_id,academic_year_id,course_id,teacher_id,name,
  enrolment_code_hash,enrolment_code_hint
) values (
  'a1000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000001',
  'Unrelated teacher class',extensions.crypt('OTHER-2026',extensions.gen_salt('bf')),'26'
);

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;

select public.teacher_record_learner_note(
  '90000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'Learner explained the firewall rule accurately after the worked example.'
);

do $$
begin
  if not exists (
    select 1 from public.teacher_notes
    where learner_id='90000000-0000-0000-0000-000000000002'
      and class_id='a0000000-0000-0000-0000-000000000001'
      and note='Learner explained the firewall rule accurately after the worked example.'
  ) then
    raise exception 'the class-scoped note was not visible to its teacher';
  end if;

  begin
    perform public.teacher_record_learner_note(
      '90000000-0000-0000-0000-000000000002',
      'a1000000-0000-0000-0000-000000000001',
      'This learner is not enrolled in the selected class.'
    );
    raise exception 'a note was attached to an unrelated class';
  exception when sqlstate '42501' then
    null;
  end;
end $$;

reset role;

do $$
begin
  if not exists (
    select 1 from public.teacher_notes
    where note='Historical note without a reliable class boundary.'
      and class_id is null
  ) then
    raise exception 'a historical note was assigned a fabricated class';
  end if;
  if not exists (
    select 1 from public.audit_logs
    where action='learner.teacher_note_recorded'
      and after_data->>'learner_id'='90000000-0000-0000-0000-000000000002'
      and after_data->>'class_id'='a0000000-0000-0000-0000-000000000001'
  ) then
    raise exception 'the scoped note was not audited';
  end if;
end $$;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set local role authenticated;

do $$
begin
  begin
    perform public.teacher_record_learner_note(
      '90000000-0000-0000-0000-000000000002',
      'a0000000-0000-0000-0000-000000000001',
      'A learner must not create a teacher note.'
    );
    raise exception 'a learner created a teacher note';
  exception when sqlstate '42501' then
    null;
  end;

  begin
    insert into public.teacher_notes(learner_id,teacher_id,class_id,note)
    values(
      '90000000-0000-0000-0000-000000000002',
      '90000000-0000-0000-0000-000000000002',
      'a0000000-0000-0000-0000-000000000001','Direct insert attempt'
    );
    raise exception 'a learner received direct note insert permission';
  exception when sqlstate '42501' then
    null;
  end;
end $$;

reset role;
rollback;
