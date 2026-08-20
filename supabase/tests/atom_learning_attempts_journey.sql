\set ON_ERROR_STOP on
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000002',true);

insert into public.learner_curriculum_attempts(
  learner_id,kind,unit_code,topic_code,paper_mode,selected_level,percentage,mark,max_mark,hints_used,active_seconds,question_results
) values(
  '90000000-0000-0000-0000-000000000002','topic_practice','2','A1',null,'Core',75,3,4,1,240,
  '[{"id":"2-A1-1","difficulty":2,"correct":true,"hintsUsed":0,"marks":1,"answer":"candidate response"}]'
),(
  '90000000-0000-0000-0000-000000000002','practice_paper','2',null,'applied',null,68,17,25,0,1800,
  '[{"id":"2-A1-1","difficulty":2,"correct":true,"hintsUsed":0,"marks":1}]'
);

do $$ begin
  if (select count(*) from public.learner_curriculum_attempts where learner_id='90000000-0000-0000-0000-000000000002')<>2
    then raise exception 'curriculum attempts were not stored'; end if;
  if not exists(select 1 from public.learner_curriculum_attempts where kind='topic_practice' and hints_used=1 and active_seconds=240)
    then raise exception 'question evidence metadata was not stored'; end if;
  begin
    insert into public.learner_curriculum_attempts(learner_id,kind,unit_code,topic_code,paper_mode,percentage,max_mark)
    values('90000000-0000-0000-0000-000000000002','practice_paper','2','A1','applied',50,4);
    raise exception 'invalid paper topic scope was accepted';
  exception when check_violation then null; end;
end $$;

select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true);
update public.learner_curriculum_attempts
set teacher_mark=19,mark=19,percentage=76,teacher_feedback='Accurate design; improve the test evidence.',reviewed_by='90000000-0000-0000-0000-000000000001',reviewed_at=now()
where learner_id='90000000-0000-0000-0000-000000000002' and kind='practice_paper';

do $$ begin
  if not exists(select 1 from public.learner_curriculum_attempts where kind='practice_paper' and teacher_mark=19 and teacher_feedback is not null)
    then raise exception 'teacher practical-paper review was not stored'; end if;
end $$;

select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000002',true);
do $$ declare changed integer; begin
  update public.learner_curriculum_attempts set teacher_mark=25 where kind='practice_paper';
  get diagnostics changed = row_count;
  if changed<>0 then raise exception 'learner was able to award a teacher mark'; end if;
end $$;
rollback;
