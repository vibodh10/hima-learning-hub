begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000002',true);

insert into public.learner_workbook_background(learner_id,experience,support_needs)
values('90000000-0000-0000-0000-000000000002','Built a website before','Needs larger text');

do $$
begin
  if not exists(select 1 from public.learner_workbook_background where learner_id='90000000-0000-0000-0000-000000000002' and experience='Built a website before') then raise exception 'learner background was not stored separately'; end if;
  begin
    insert into public.learner_curriculum_progress(learner_id,unit_code,topic_code,selected_level,lesson_completed_at,practice_score,mastery_score,independent_attempts,evidence)
    values('90000000-0000-0000-0000-000000000002','6','A1','Core',now(),90,90,1,'[{"kind":"topic_mastery","independent":true,"hintsUsed":0}]');
    raise exception 'single answer incorrectly awarded mastery';
  exception when check_violation then null; end;
end $$;

insert into public.learner_curriculum_progress(learner_id,unit_code,topic_code,selected_level,lesson_completed_at,practice_score,mastery_score,mastered_at,independent_attempts,retrieval_due_at,evidence)
values('90000000-0000-0000-0000-000000000002','6','A1','Core',now(),90,90,now(),3,now()+interval '14 days','[{"kind":"topic_mastery","independent":true,"hintsUsed":0},{"kind":"topic_mastery","independent":true,"hintsUsed":0},{"kind":"topic_mastery","independent":true,"hintsUsed":0}]');

set local role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true);
insert into public.workbook_teacher_decisions(learner_id,teacher_id,organisation_id,unit_code,decision_type,original_route,new_route,reason)
values('90000000-0000-0000-0000-000000000002','90000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','6','project_unlock','locked','teacher preview access','Approved for supervised project familiarisation; mastery is unchanged.');

do $$ begin
  if not exists(select 1 from public.workbook_teacher_decisions where learner_id='90000000-0000-0000-0000-000000000002' and teacher_id='90000000-0000-0000-0000-000000000001' and original_route='locked' and reason is not null) then raise exception 'audited teacher decision missing'; end if;
end $$;
rollback;
