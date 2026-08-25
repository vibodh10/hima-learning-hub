\set ON_ERROR_STOP on

begin;

update public.classes set weekly_learning_day=extract(isodow from current_date)::integer
where id='a0000000-0000-0000-0000-000000000001';

create temporary table journey_input(template_id uuid);
insert into journey_input
select template.id from public.learning_journey_templates template
join public.units unit on unit.id=template.unit_id
where unit.code='4' and template.status='approved'
  and unit.course_id=(select course_id from public.classes
    where id='a0000000-0000-0000-0000-000000000001') limit 1;
grant select on journey_input to authenticated;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
select public.start_group_learning_journey(
  'a0000000-0000-0000-0000-000000000001',(select template_id from journey_input)
);
reset role;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set local role authenticated;
select public.begin_my_topic_catch_up('4','A4');
select public.submit_my_topic_worksheet(
  '4','A4','catch_up','learning',
  '{"recap":"I recalled sequence and selection.","mainTask":"I produced and tested a menu program.","knowledgeCheck":"Selection chooses one branch.","improvement":"I added input validation.","todayCan":"I can use selection.","exitTicket":"Next I will practise iteration."}'::jsonb,
  4
);

do $$
begin
  if (select count(*) from public.learner_topic_worksheets)<>1 then
    raise exception 'the learner worksheet was not stored';
  end if;
  if not exists(select 1 from public.learner_topic_worksheets
      where evidence_stage='learning') then
    raise exception 'the catch-up worksheet stage was not retained';
  end if;
  if (select count(*) from public.learner_portfolio_artifacts
      where source_type='topic_worksheet')<>1 then
    raise exception 'the worksheet was not added to the portfolio';
  end if;
  if not exists(select 1 from public.learner_catch_up_records
      where completed_at is not null and completion_worksheet_id is not null) then
    raise exception 'the catch-up record was not completed by worksheet evidence';
  end if;
end $$;

reset role;

do $$
begin
  begin
    update public.learner_topic_worksheets set confidence=5;
    raise exception 'an existing worksheet was overwritten';
  exception when sqlstate '55000' then null;
  end;
  begin
    delete from public.learner_portfolio_artifacts;
    raise exception 'a portfolio artefact was deleted';
  exception when sqlstate '55000' then null;
  end;
end $$;

rollback;
