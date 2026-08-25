\set ON_ERROR_STOP on
update public.user_profiles set role='administrator'
where id='90000000-0000-0000-0000-000000000001';
create temporary table teacher_control_ids(label text primary key,id uuid);
grant select,insert on teacher_control_ids to authenticated;
grant select on public.targets to authenticated;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set role authenticated;
do $$ begin
  perform public.submit_activity(
    '71000000-0000-0000-0000-000000000001','{}'::jsonb,0
  );
end $$;
reset role;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set role authenticated;

insert into teacher_control_ids values('lesson',public.teacher_save_lesson(
  '61000000-0000-0000-0000-000000000001',
  '51000000-0000-0000-0000-000000000001',
  1,'Python foundations: input, processing and output',
  'Use meaningful variables and explicit conversion so each value has the type needed by the processing.',
  'A variable name refers to a value. input() always returns a string.',
  'Plan inputs, convert types, calculate a result, then present it with a labelled f-string.',
  'Which conversion or output decision are you least confident about?',
  'Python','["Trace variable values","Convert input for arithmetic"]'::jsonb,60,'approved'
));

insert into teacher_control_ids values('question',public.teacher_create_question(
  '71000000-0000-0000-0000-000000000002',
  '52000000-0000-0000-0000-000000000001',
  'code_output','Core',
  E'Controlled draft check:\nvalue = 2\nvalue = value + 4\nprint(value)',
  '"6"'::jsonb,'[]'::jsonb,
  'The second assignment stores 6.','Correct.','Trace both assignments.',
  'Start at 2 and add 4.',1,45,'[]'::jsonb,'draft'
));

select public.teacher_set_content_status(
  'question',(select id from teacher_control_ids where label='question'),'approved'
);

insert into teacher_control_ids values('allocation',public.teacher_allocate_activity(
  '71000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',null,'Core',
  now(),now()+interval '7 days',true
));

insert into teacher_control_ids values('gamification',public.teacher_set_gamification(
  'a0000000-0000-0000-0000-000000000001',null,false,false,false
));

insert into teacher_control_ids values('coin',public.teacher_adjust_coins(
  '90000000-0000-0000-0000-000000000002',5,'Test correction with an audit reason.'
));

select public.teacher_update_target(
  (select id from public.targets where learner_id='90000000-0000-0000-0000-000000000002'
    and status='proposed' order by created_at desc limit 1),
  'active',
  (select target_text from public.targets where learner_id='90000000-0000-0000-0000-000000000002'
    and status='proposed' order by created_at desc limit 1),
  'Approved after reviewing the underlying skill evidence.'
);

select public.teacher_override_activity_lock(
  '90000000-0000-0000-0000-000000000002',
  '71000000-0000-0000-0000-000000000003',
  'Automated disabled-gamification journey',
  null
);

reset role;

create temporary table disabled_gamification_baseline as
select
  (select count(*) from public.coin_transactions where learner_id='90000000-0000-0000-0000-000000000002') coin_count,
  (select count(*) from public.badge_awards where learner_id='90000000-0000-0000-0000-000000000002') badge_count;
delete from public.practice_streaks where learner_id='90000000-0000-0000-0000-000000000002';

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set role authenticated;
select public.submit_activity(
  '71000000-0000-0000-0000-000000000003','{}'::jsonb,0
);
reset role;

do $$
begin
  if (select status from public.questions where id=(select id from teacher_control_ids where label='question')) <> 'approved' then
    raise exception 'teacher question approval failed';
  end if;
  if not exists(select 1 from public.activity_questions where question_id=(select id from teacher_control_ids where label='question')) then
    raise exception 'question was not connected to its activity';
  end if;
  if not exists(select 1 from public.activity_allocations where id=(select id from teacher_control_ids where label='allocation') and required) then
    raise exception 'class allocation failed';
  end if;
  if (select streaks_enabled from public.gamification_settings where id=(select id from teacher_control_ids where label='gamification')) then
    raise exception 'class gamification setting did not update';
  end if;
  if (select coins_enabled or badges_enabled from public.gamification_settings where id=(select id from teacher_control_ids where label='gamification')) then
    raise exception 'coin or badge setting did not update';
  end if;
  if (select count(*) from public.coin_transactions where learner_id='90000000-0000-0000-0000-000000000002')
      <> (select coin_count from disabled_gamification_baseline) then
    raise exception 'disabled coins were still awarded';
  end if;
  if (select count(*) from public.badge_awards where learner_id='90000000-0000-0000-0000-000000000002')
      <> (select badge_count from disabled_gamification_baseline) then
    raise exception 'disabled badges were still awarded';
  end if;
  if exists(select 1 from public.practice_streaks where learner_id='90000000-0000-0000-0000-000000000002') then
    raise exception 'disabled streak was still updated';
  end if;
  if not exists(select 1 from public.coin_transactions where id=(select id from teacher_control_ids where label='coin') and amount=5 and reason='teacher_correction') then
    raise exception 'audited coin correction missing';
  end if;
  if not exists(select 1 from public.targets where learner_id='90000000-0000-0000-0000-000000000002' and status='active' and approved_by='90000000-0000-0000-0000-000000000001') then
    raise exception 'target approval failed';
  end if;
  if (select count(*) from public.audit_logs where actor_id='90000000-0000-0000-0000-000000000001'
      and action in ('lesson.saved','question.created','content.status_changed','activity.allocated','gamification.updated','coins.corrected','target.updated')) < 7 then
    raise exception 'teacher control audit trail incomplete';
  end if;
end $$;

select 'teacher adaptive controls journey passed' as result;
