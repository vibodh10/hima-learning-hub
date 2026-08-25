\set ON_ERROR_STOP on

begin;

update public.classes set weekly_learning_day=1
where id='a0000000-0000-0000-0000-000000000001';

create temporary table started_journey(id uuid);
grant select,insert on started_journey to authenticated;
create temporary table journey_input(template_id uuid);
insert into journey_input
select template.id from public.learning_journey_templates template
join public.units unit on unit.id=template.unit_id
where unit.code='4' and template.status='approved'
  and unit.course_id=(select course_id from public.classes
    where id='a0000000-0000-0000-0000-000000000001')
limit 1;
grant select on journey_input to authenticated;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;

insert into started_journey
select public.start_group_learning_journey(
  'a0000000-0000-0000-0000-000000000001',
  (select template_id from journey_input)
);

reset role;

do $$
begin
  if (select count(*) from public.learning_journey_templates template
      join public.units unit on unit.id=template.unit_id
      where unit.code in ('2','4','6') and template.status='approved')<>3 then
    raise exception 'Units 2, 4 and 6 do not each have one approved shared journey';
  end if;
  if (select count(*) from public.learning_journey_weeks journey_week
      where journey_week.template_id=(select template_id from public.group_learning_journeys
        where id=(select id from started_journey)))<>12 then
    raise exception 'the activated journey does not contain 12 teaching weeks';
  end if;
  if exists(
    select 1 from public.learning_journey_weeks journey_week
    join public.learning_journey_templates template on template.id=journey_week.template_id
    join public.units unit on unit.id=template.unit_id
    where unit.code in ('2','4','6')
      and (journey_week.configuration->>'topic_code' is null
        or journey_week.configuration->>'resource_kind'<>'configured_topic_hub')
  ) then
    raise exception 'a Unit 2, 4 or 6 teaching week is not mapped to configured topic resources';
  end if;
  if (select started_on from public.group_learning_journeys
      where id=(select id from started_journey))<>current_date then
    raise exception 'the teacher was required to supply a journey date';
  end if;
end $$;

update public.group_learning_journeys set started_on='2026-09-28'
where id=(select id from started_journey);

insert into public.academic_calendar_events(
  academic_year_id,title,kind,starts_on,ends_on
) values(
  '20000000-0000-0000-0000-000000000001','Autumn half term','holiday',
  '2026-10-19','2026-10-23'
);

set local role authenticated;

do $$
declare position record;
begin
  select * into position from public.current_class_learning_journey(
    'a0000000-0000-0000-0000-000000000001','2026-10-19'
  );
  if position.position_status<>'paused' or position.teaching_week<>3
    or position.next_teaching_on<>'2026-10-26' then
    raise exception 'half term did not pause the journey at teaching week 3: %',row_to_json(position);
  end if;

  select * into position from public.current_class_learning_journey(
    'a0000000-0000-0000-0000-000000000001','2026-10-26'
  );
  if position.position_status<>'in_progress' or position.teaching_week<>4 then
    raise exception 'the journey did not resume at teaching week 4: %',row_to_json(position);
  end if;
end $$;

reset role;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set local role authenticated;

do $$
begin
  if (select count(*) from public.group_learning_journeys)<>1 then
    raise exception 'the enrolled learner cannot read their group journey';
  end if;
end $$;

reset role;
rollback;
