-- Adaptive submission engine: immutable evidence, skill mastery,
-- misconceptions, retrieval, badges and server-controlled coins.

create or replace function public.pathway_for(score numeric, hint_count integer default 0)
returns public.pathway
language sql immutable
as $$
  select case
    when greatest(0,score-least(hint_count*4,20)) < 50 then 'Support'::public.pathway
    when greatest(0,score-least(hint_count*4,20)) < 70 then 'Core'::public.pathway
    when greatest(0,score-least(hint_count*4,20)) < 85 then 'Stretch'::public.pathway
    else 'Mastery'::public.pathway end
$$;

create or replace function public.submit_activity(
  activity_uuid uuid,
  submitted_answers jsonb,
  hint_count integer default 0
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  actor public.user_profiles;
  selected_activity public.activities;
  selected_topic uuid;
  answer_row record;
  supplied jsonb;
  accepted text[];
  is_right boolean;
  earned numeric := 0;
  available numeric := 0;
  answer_mark numeric;
  attempt_no integer;
  attempt_uuid uuid;
  result_percent numeric;
  result_pathway public.pathway;
  feedback_rows jsonb := '[]'::jsonb;
  mastery_rows jsonb := '[]'::jsonb;
  awarded_badges jsonb := '[]'::jsonb;
  previous_topic public.topic_progress;
  previous_attempt public.attempts;
  new_average numeric;
  review_on date := current_date + 14;
  review_activity uuid;
  skill_row record;
  old_mastery numeric;
  skill_accuracy numeric;
  effective_mastery numeric;
  skill_pathway public.pathway;
  misconception_uuid uuid;
  coins_awarded integer := 0;
  first_step_badge uuid;
  practice_badge uuid;
  comeback_badge uuid;
  python_badge uuid;
  completed_count integer;
  badges_enabled boolean := true;
  coins_enabled boolean := true;
  streaks_enabled boolean := true;
begin
  select * into actor from public.user_profiles
    where id=auth.uid() and role='student' and archived_at is null;
  if actor.id is null then raise exception 'not_authorised' using errcode='42501'; end if;
  if jsonb_typeof(submitted_answers) <> 'object' or hint_count < 0 then
    raise exception 'invalid_submission' using errcode='22023';
  end if;

  select
    coalesce(
      (select gs.badges_enabled from public.gamification_settings gs where gs.learner_id=actor.id),
      (select gs.badges_enabled from public.gamification_settings gs join public.enrolments e on e.class_id=gs.class_id
        where e.student_id=actor.id and e.archived_at is null order by gs.updated_at desc limit 1),
      (select gs.badges_enabled from public.gamification_settings gs
        where gs.organisation_id=actor.organisation_id and gs.class_id is null and gs.learner_id is null),
      true
    ),
    coalesce(
      (select gs.coins_enabled from public.gamification_settings gs where gs.learner_id=actor.id),
      (select gs.coins_enabled from public.gamification_settings gs join public.enrolments e on e.class_id=gs.class_id
        where e.student_id=actor.id and e.archived_at is null order by gs.updated_at desc limit 1),
      (select gs.coins_enabled from public.gamification_settings gs
        where gs.organisation_id=actor.organisation_id and gs.class_id is null and gs.learner_id is null),
      true
    ),
    coalesce(
      (select gs.streaks_enabled from public.gamification_settings gs where gs.learner_id=actor.id),
      (select gs.streaks_enabled from public.gamification_settings gs join public.enrolments e on e.class_id=gs.class_id
        where e.student_id=actor.id and e.archived_at is null order by gs.updated_at desc limit 1),
      (select gs.streaks_enabled from public.gamification_settings gs
        where gs.organisation_id=actor.organisation_id and gs.class_id is null and gs.learner_id is null),
      true
    )
  into badges_enabled,coins_enabled,streaks_enabled;

  select a.* into selected_activity
  from public.activities a
  join public.lessons l on l.id=a.lesson_id
  join public.topics t on t.id=l.topic_id
  join public.units u on u.id=t.unit_id
  join public.courses co on co.id=u.course_id
  where a.id=activity_uuid and a.archived_at is null and a.status='approved'
    and (a.release_at is null or a.release_at<=now())
    and exists(
      select 1 from public.enrolments e join public.classes c on c.id=e.class_id
      where e.student_id=actor.id and e.archived_at is null
        and c.course_id=co.id and c.archived_at is null
    );
  if selected_activity.id is null then
    raise exception 'activity_not_available' using errcode='42501';
  end if;

  select l.topic_id into selected_topic from public.lessons l where l.id=selected_activity.lesson_id;
  select * into previous_attempt from public.attempts
    where learner_id=actor.id and activity_id=activity_uuid and completed_at is not null
    order by attempt_number desc limit 1;
  select coalesce(max(a.attempt_number),0)+1 into attempt_no
    from public.attempts a where a.learner_id=actor.id and a.activity_id=activity_uuid;
  if attempt_no > selected_activity.max_attempts then
    raise exception 'attempt_limit_reached' using errcode='22023';
  end if;

  insert into public.attempts(
    learner_id,activity_id,attempt_number,pathway,hints_used,mastery_before
  )
  values(
    actor.id,activity_uuid,attempt_no,selected_activity.pathway,hint_count,
    coalesce((select jsonb_object_agg(skill_id,mastery_score)
      from public.skill_mastery where learner_id=actor.id),'{}'::jsonb)
  ) returning id into attempt_uuid;

  for answer_row in
    select q.* from public.activity_questions aq
    join public.questions q on q.id=aq.question_id
    where aq.activity_id=activity_uuid and q.archived_at is null and q.status='approved'
    order by aq.sort_order
  loop
    supplied := submitted_answers -> answer_row.id::text;
    is_right := false;
    misconception_uuid := null;
    if answer_row.kind='multiple_response' then
      select coalesce(array_agg(lower(trim(value)) order by lower(trim(value))),'{}')
        into accepted from jsonb_array_elements_text(answer_row.correct_answer);
      is_right := accepted = (
        select coalesce(array_agg(lower(trim(value)) order by lower(trim(value))),'{}')
        from jsonb_array_elements_text(
          case when jsonb_typeof(supplied)='array' then supplied else '[]'::jsonb end
        )
      );
    elsif answer_row.kind='numeric' then
      begin
        is_right := abs(
          (supplied#>>'{}')::numeric-(answer_row.correct_answer#>>'{}')::numeric
        ) <= coalesce(answer_row.numeric_tolerance,0);
      exception when invalid_text_representation then is_right := false;
      end;
    elsif answer_row.kind in (
      'fill_blank','short_text','code_output','code_completion','identify_error',
      'correct_code','sql_completion','html_css_completion','scenario_decision'
    ) then
      select array_agg(lower(regexp_replace(trim(value),'\s+',' ','g'))) into accepted
      from (
        select answer_row.correct_answer#>>'{}' value
        union all
        select jsonb_array_elements_text(answer_row.acceptable_answers)
      ) valueset;
      is_right := lower(regexp_replace(trim(coalesce(supplied#>>'{}','')),'\s+',' ','g'))
        = any(accepted);
    else
      is_right := lower(trim(coalesce(supplied#>>'{}','')))
        = lower(trim(answer_row.correct_answer#>>'{}'));
    end if;

    is_right := coalesce(is_right,false);
    answer_mark := case when is_right then answer_row.marks else 0 end;
    earned := earned + answer_mark;
    available := available + answer_row.marks;

    if not is_right and answer_row.skill_id is not null then
      select qm.misconception_id into misconception_uuid
      from public.question_misconceptions qm
      where qm.question_id=answer_row.id
        and (qm.trigger_answer is null or qm.trigger_answer=supplied)
      order by qm.misconception_id limit 1;
      if misconception_uuid is not null then
        insert into public.learner_misconceptions(
          learner_id,misconception_id,occurrence_count,first_seen_at,last_seen_at
        ) values(actor.id,misconception_uuid,1,now(),now())
        on conflict(learner_id,misconception_id) do update
          set occurrence_count=public.learner_misconceptions.occurrence_count+1,
              last_seen_at=now(),resolved_at=null;
      end if;
    else
      misconception_uuid := null;
    end if;

    insert into public.attempt_answers(
      attempt_id,question_id,answer,mark,max_mark,is_correct,feedback,hints_used,
      skill_id,difficulty,started_at,completed_at,mastery_before,misconception_id
    ) values(
      attempt_uuid,answer_row.id,coalesce(supplied,'null'::jsonb),answer_mark,
      answer_row.marks,is_right,
      case when is_right then coalesce(answer_row.feedback_correct,answer_row.explanation)
        else coalesce(answer_row.feedback_incorrect,answer_row.explanation) end,
      0,answer_row.skill_id,answer_row.difficulty,now(),now(),
      (select mastery_score from public.skill_mastery
        where learner_id=actor.id and skill_id=answer_row.skill_id),
      misconception_uuid
    );

    feedback_rows := feedback_rows || jsonb_build_array(jsonb_build_object(
      'questionId',answer_row.id,'correct',is_right,'mark',answer_mark,
      'maxMark',answer_row.marks,'correctAnswer',answer_row.correct_answer,
      'explanation',answer_row.explanation,
      'feedback',case when is_right then answer_row.feedback_correct else answer_row.feedback_incorrect end,
      'misconceptionId',misconception_uuid
    ));
    misconception_uuid := null;
  end loop;

  result_percent := case when available=0 then 0 else round(earned/available*100,2) end;
  result_pathway := public.pathway_for(result_percent,hint_count);

  for skill_row in
    select aa.skill_id,
      round(sum(aa.mark)/nullif(sum(aa.max_mark),0)*100,2) accuracy,
      count(*) filter(where not aa.is_correct) incorrect_count
    from public.attempt_answers aa
    where aa.attempt_id=attempt_uuid and aa.skill_id is not null
    group by aa.skill_id
  loop
    select mastery_score into old_mastery from public.skill_mastery
      where learner_id=actor.id and skill_id=skill_row.skill_id;
    old_mastery := coalesce(old_mastery,0);
    skill_accuracy := coalesce(skill_row.accuracy,0);
    effective_mastery := greatest(0,least(100,
      round(
        case when old_mastery=0 then skill_accuracy
          else old_mastery*0.35 + skill_accuracy*0.65 end
        - least(hint_count*4,20)
        - least(skill_row.incorrect_count*2,10)
      ,2)
    ));
    skill_pathway := public.pathway_for(effective_mastery,0);

    insert into public.skill_mastery(
      learner_id,skill_id,first_attempt_accuracy,latest_accuracy,best_accuracy,
      mastery_score,current_pathway,attempts_count,hints_used,repeated_error_count,
      improvement,last_practised_at
    ) values(
      actor.id,skill_row.skill_id,skill_accuracy,skill_accuracy,skill_accuracy,
      effective_mastery,skill_pathway,1,hint_count,skill_row.incorrect_count,
      effective_mastery-old_mastery,now()
    )
    on conflict(learner_id,skill_id) do update set
      latest_accuracy=excluded.latest_accuracy,
      best_accuracy=greatest(public.skill_mastery.best_accuracy,excluded.best_accuracy),
      mastery_score=excluded.mastery_score,
      current_pathway=excluded.current_pathway,
      attempts_count=public.skill_mastery.attempts_count+1,
      hints_used=public.skill_mastery.hints_used+excluded.hints_used,
      repeated_error_count=case when skill_row.incorrect_count=0 then 0
        else public.skill_mastery.repeated_error_count+skill_row.incorrect_count end,
      improvement=excluded.mastery_score-public.skill_mastery.mastery_score,
      last_practised_at=now(),updated_at=now();

    update public.attempt_answers aa set mastery_after=effective_mastery
      where aa.attempt_id=attempt_uuid and aa.skill_id=skill_row.skill_id;
    mastery_rows := mastery_rows || jsonb_build_array(jsonb_build_object(
      'skillId',skill_row.skill_id,'before',old_mastery,'after',effective_mastery,
      'masteryScore',effective_mastery,'accuracy',skill_accuracy,'pathway',skill_pathway,
      'title',(select title from public.skills where id=skill_row.skill_id)
    ));

    if coins_enabled and skill_pathway='Mastery' then
      insert into public.coin_transactions(
        learner_id,amount,reason,description,source_attempt_id,source_activity_id,
        idempotency_key,created_by,metadata
      ) values(
        actor.id,15,'skill_mastery','Achieved independent skill mastery.',
        attempt_uuid,activity_uuid,format('skill-mastery:%s',skill_row.skill_id),actor.id,
        jsonb_build_object('skill_id',skill_row.skill_id,'mastery',effective_mastery)
      ) on conflict(learner_id,idempotency_key) do nothing;
      if found then coins_awarded := coins_awarded + 15; end if;
    end if;
  end loop;

  update public.attempts set
    completed_at=now(),mark=earned,max_mark=available,percentage=result_percent,
    feedback_shown=true,pathway=result_pathway,mastery_after=(
      select coalesce(jsonb_object_agg(skill_id,mastery_score),'{}'::jsonb)
      from public.skill_mastery where learner_id=actor.id
    )
  where id=attempt_uuid;

  select * into previous_topic from public.topic_progress
    where learner_id=actor.id and topic_id=selected_topic;
  new_average := case when previous_topic.learner_id is null then result_percent
    else round(
      ((previous_topic.average_score*previous_topic.attempt_count)+result_percent)
      /(previous_topic.attempt_count+1),2
    ) end;
  insert into public.topic_progress(
    learner_id,topic_id,first_score,latest_score,best_score,average_score,
    attempt_count,completion_rate,current_pathway
  ) values(
    actor.id,selected_topic,result_percent,result_percent,result_percent,result_percent,
    1,100,result_pathway
  )
  on conflict(learner_id,topic_id) do update set
    latest_score=excluded.latest_score,
    best_score=greatest(public.topic_progress.best_score,excluded.best_score),
    average_score=new_average,attempt_count=public.topic_progress.attempt_count+1,
    completion_rate=100,current_pathway=result_pathway,updated_at=now();

  if streaks_enabled then
    insert into public.practice_days(learner_id,practice_date,scheduled,qualifying_attempt_id)
    values(actor.id,current_date,true,attempt_uuid)
    on conflict(learner_id,practice_date) do nothing;
    insert into public.practice_streaks(learner_id,current_count,best_count,last_practice_date)
    values(actor.id,1,1,current_date)
    on conflict(learner_id) do update set
      current_count=case
        when public.practice_streaks.last_practice_date=current_date then public.practice_streaks.current_count
        when public.practice_streaks.last_practice_date>=current_date-2 then public.practice_streaks.current_count+1
        else 1 end,
      best_count=greatest(public.practice_streaks.best_count,case
        when public.practice_streaks.last_practice_date=current_date then public.practice_streaks.current_count
        when public.practice_streaks.last_practice_date>=current_date-2 then public.practice_streaks.current_count+1
        else 1 end),
      last_practice_date=current_date,updated_at=now();
  end if;

  -- Full completion reward is unique per activity, preventing repeat farming.
  if coins_enabled then
    insert into public.coin_transactions(
      learner_id,amount,reason,description,source_attempt_id,source_activity_id,
      idempotency_key,created_by
    ) values(
      actor.id,10,'required_learning','Completed an approved learning activity.',
      attempt_uuid,activity_uuid,format('activity-complete:%s',activity_uuid),actor.id
    ) on conflict(learner_id,idempotency_key) do nothing;
    if found then coins_awarded := coins_awarded + 10; end if;
  end if;

  if coins_enabled and previous_attempt.id is not null and result_percent-previous_attempt.percentage>=10 then
    insert into public.coin_transactions(
      learner_id,amount,reason,description,source_attempt_id,source_activity_id,
      idempotency_key,created_by,metadata
    ) values(
      actor.id,5,'improvement','Improved a previous result by at least 10 points.',
      attempt_uuid,activity_uuid,format('improvement:%s',attempt_uuid),actor.id,
      jsonb_build_object('before',previous_attempt.percentage,'after',result_percent)
    ) on conflict(learner_id,idempotency_key) do nothing;
    if found then coins_awarded := coins_awarded + 5; end if;
  end if;

  if selected_activity.learning_stage='retrieval_review' then
    if coins_enabled then
      insert into public.coin_transactions(
        learner_id,amount,reason,description,source_attempt_id,source_activity_id,
        idempotency_key,created_by
      ) values(
        actor.id,8,'retrieval','Completed a scheduled retrieval review.',
        attempt_uuid,activity_uuid,format('retrieval:%s',activity_uuid),actor.id
      ) on conflict(learner_id,idempotency_key) do nothing;
      if found then coins_awarded := coins_awarded + 8; end if;
    end if;
    update public.retrieval_schedules set status='completed',
      completed_attempt_id=attempt_uuid,completed_at=now()
    where learner_id=actor.id and review_activity_id=activity_uuid
      and status in ('scheduled','available');
  elsif selected_activity.learning_stage='mastery_check' then
    select a.id into review_activity from public.activities a
      where a.lesson_id=selected_activity.lesson_id
        and a.learning_stage='retrieval_review' and a.status='approved'
        and a.archived_at is null order by a.id limit 1;
    if review_activity is not null then
      insert into public.retrieval_schedules(
        learner_id,topic_id,source_activity_id,review_activity_id,scheduled_for
      ) values(actor.id,selected_topic,activity_uuid,review_activity,current_date+7)
      on conflict(learner_id,source_activity_id,scheduled_for) do nothing;
    end if;
  end if;

  if badges_enabled then
    select id into first_step_badge from public.badge_definitions
      where organisation_id=actor.organisation_id and code='first-step' and enabled;
    if first_step_badge is not null then
    insert into public.badge_awards(learner_id,badge_id,reason,evidence,source_attempt_id)
    values(actor.id,first_step_badge,'Completed the first learning activity.',
      jsonb_build_object('attempt_id',attempt_uuid),attempt_uuid)
    on conflict(learner_id,badge_id) do nothing;
    if found then
      awarded_badges := awarded_badges || jsonb_build_array('First Step');
      insert into public.achievements(learner_id,code,title)
        values(actor.id,'first-step','First Step') on conflict(learner_id,code) do nothing;
    end if;
    end if;

    select count(*) into completed_count from public.attempts
      where learner_id=actor.id and completed_at is not null;
    if completed_count>=5 then
    select id into practice_badge from public.badge_definitions
      where organisation_id=actor.organisation_id and code='practice-starter' and enabled;
    if practice_badge is not null then
      insert into public.badge_awards(learner_id,badge_id,reason,evidence,source_attempt_id)
      values(actor.id,practice_badge,'Completed five practice sessions.',
        jsonb_build_object('completed_attempts',completed_count),attempt_uuid)
      on conflict(learner_id,badge_id) do nothing;
      if found then awarded_badges := awarded_badges || jsonb_build_array('Practice Starter'); end if;
    end if;
    end if;

    if previous_attempt.id is not null and result_percent-previous_attempt.percentage>=20 then
    select id into comeback_badge from public.badge_definitions
      where organisation_id=actor.organisation_id and code='comeback' and enabled;
    if comeback_badge is not null then
      insert into public.badge_awards(learner_id,badge_id,reason,evidence,source_attempt_id)
      values(actor.id,comeback_badge,'Improved a previous score by at least 20 points.',
        jsonb_build_object('before',previous_attempt.percentage,'after',result_percent),attempt_uuid)
      on conflict(learner_id,badge_id) do nothing;
      if found then awarded_badges := awarded_badges || jsonb_build_array('Comeback'); end if;
    end if;
    end if;

    if selected_topic='51000000-0000-0000-0000-000000000001'
      and selected_activity.learning_stage='mastery_check' then
    select id into python_badge from public.badge_definitions
      where organisation_id=actor.organisation_id and code='python-explorer' and enabled;
    if python_badge is not null then
      insert into public.badge_awards(learner_id,badge_id,reason,evidence,source_attempt_id)
      values(actor.id,python_badge,'Completed the first approved Python topic.',
        jsonb_build_object('topic_id',selected_topic,'attempt_id',attempt_uuid),attempt_uuid)
      on conflict(learner_id,badge_id) do nothing;
      if found then awarded_badges := awarded_badges || jsonb_build_array('Python Explorer'); end if;
    end if;
    end if;
  end if;

  -- Replace only an unapproved suggestion so active teacher-approved targets
  -- are retained. The new suggestion names the weakest recorded skill.
  if not exists(
    select 1 from public.targets
    where learner_id=actor.id and topic_id=selected_topic and status='active'
  ) then
    update public.targets set status='replaced',archived_at=now()
      where learner_id=actor.id and topic_id=selected_topic and status='proposed';
    insert into public.targets(learner_id,topic_id,target_text,reason,target_date,evidence)
    select actor.id,selected_topic,
      format('Complete the %s %s practice and achieve at least %s%% in the next review.',
        s.title,sm.current_pathway,
        case sm.current_pathway when 'Support' then 70 when 'Core' then 75
          when 'Stretch' then 85 else 90 end),
      format('Skill mastery is %s%% after the latest attempt.',sm.mastery_score),
      review_on,jsonb_build_object(
        'attempt_id',attempt_uuid,'skill_id',sm.skill_id,
        'mastery',sm.mastery_score,'pathway',sm.current_pathway
      )
    from public.skill_mastery sm join public.skills s on s.id=sm.skill_id
    where sm.learner_id=actor.id and s.topic_id=selected_topic
    order by sm.mastery_score asc,sm.updated_at desc limit 1;
    if not found then
      insert into public.targets(
        learner_id,topic_id,target_text,reason,target_date,evidence
      )
      select actor.id,selected_topic,
        format('Complete the %s %s practice and achieve at least %s%% in the next review.',
          t.title,result_pathway,
          case result_pathway when 'Support' then 70 when 'Core' then 75
            when 'Stretch' then 85 else 90 end),
        format('Latest recorded score: %s%%.',result_percent),review_on,
        jsonb_build_object(
          'attempt_id',attempt_uuid,'score',result_percent,'pathway',result_pathway
        )
      from public.topics t where t.id=selected_topic;
    end if;
  end if;

  return jsonb_build_object(
    'attemptId',attempt_uuid,'mark',earned,'maxMark',available,
    'percentage',result_percent,'pathway',result_pathway,
    'feedback',feedback_rows,'skillMastery',mastery_rows,
    'coinsAwarded',coins_awarded,'badgesAwarded',awarded_badges
  );
end $$;

revoke all on function public.submit_activity(uuid,jsonb,integer) from public;
grant execute on function public.submit_activity(uuid,jsonb,integer) to authenticated;
