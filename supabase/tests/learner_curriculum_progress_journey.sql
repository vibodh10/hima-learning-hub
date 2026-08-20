\set ON_ERROR_STOP on

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set role authenticated;

insert into public.learner_curriculum_progress(
  learner_id,unit_code,topic_code,selected_level,topic_started_at
) values(
  '90000000-0000-0000-0000-000000000002','2','A1','Challenge',now()
);

update public.learner_curriculum_progress set
  lesson_completed_at=now(),practice_score=78,hints_used=1,
  mastery_score=82,mastered_at=now(),independent_attempts=3,
  evidence='[{"kind":"topic_mastery","independent":true,"hintsUsed":0},{"kind":"topic_mastery","independent":true,"hintsUsed":0},{"kind":"topic_mastery","independent":true,"hintsUsed":0}]'
where learner_id='90000000-0000-0000-0000-000000000002'
  and unit_code='2' and topic_code='A1';

do $$
begin
  if not exists(
    select 1 from public.learner_curriculum_progress
    where learner_id='90000000-0000-0000-0000-000000000002'
      and selected_level='Challenge' and practice_score=78
      and hints_used=1 and mastery_score=82 and mastered_at is not null
  ) then raise exception 'learner curriculum progress was not persisted'; end if;
end $$;

do $$
begin
  begin
    insert into public.learner_curriculum_progress(
      learner_id,unit_code,topic_code,selected_level,mastery_score,mastered_at
    ) values(
      '90000000-0000-0000-0000-000000000002','2','A2','Challenge',90,now()
    );
    raise exception 'false mastery was accepted';
  exception when check_violation then null;
  end;
end $$;

reset role;
