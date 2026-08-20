-- Server-side teacher controls for adaptive content, allocation, targets and
-- coin corrections. All functions constrain writes to the actor's organisation.

create function public.teacher_save_lesson(
  lesson_uuid uuid,
  topic_uuid uuid,
  week_value integer,
  title_value text,
  learn_value text,
  remember_value text,
  worked_example_value text,
  reflection_value text,
  language_value text,
  objectives_value jsonb,
  minutes_value integer,
  status_value text
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare
  actor public.user_profiles;
  saved_uuid uuid;
  aim_uuid uuid;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role in ('teacher','administrator') and archived_at is null;
  if actor.id is null then raise exception 'not_authorised' using errcode='42501'; end if;
  if status_value not in ('draft','approved','archived') then raise exception 'invalid_status' using errcode='22023'; end if;
  if week_value < 1 or minutes_value < 5 or length(trim(title_value)) < 3 then
    raise exception 'invalid_lesson' using errcode='22023';
  end if;
  select t.learning_aim_id into aim_uuid
  from public.topics t join public.units u on u.id=t.unit_id join public.courses c on c.id=u.course_id
  where t.id=topic_uuid and c.organisation_id=actor.organisation_id and t.archived_at is null;
  if not found then raise exception 'topic_not_available' using errcode='42501'; end if;

  if lesson_uuid is null then
    insert into public.lessons(
      topic_id,learning_aim_id,week_number,title,remember,learn,worked_example,
      reflection_prompt,status,language,objectives,estimated_minutes,authored_by,
      approved_by,approved_at
    ) values(
      topic_uuid,aim_uuid,week_value,trim(title_value),nullif(trim(remember_value),''),
      trim(learn_value),trim(worked_example_value),nullif(trim(reflection_value),''),
      status_value::public.content_status,nullif(trim(language_value),''),
      objectives_value,minutes_value,actor.id,
      case when status_value='approved' then actor.id end,
      case when status_value='approved' then now() end
    ) returning id into saved_uuid;
  else
    update public.lessons l set
      topic_id=topic_uuid,learning_aim_id=aim_uuid,week_number=week_value,
      title=trim(title_value),remember=nullif(trim(remember_value),''),
      learn=trim(learn_value),worked_example=trim(worked_example_value),
      reflection_prompt=nullif(trim(reflection_value),''),
      status=status_value::public.content_status,language=nullif(trim(language_value),''),
      objectives=objectives_value,estimated_minutes=minutes_value,updated_at=now(),
      approved_by=case when status_value='approved' then actor.id else l.approved_by end,
      approved_at=case when status_value='approved' then now() else l.approved_at end,
      archived_at=case when status_value='archived' then coalesce(l.archived_at,now()) else null end
    where l.id=lesson_uuid and exists(
      select 1 from public.topics t join public.units u on u.id=t.unit_id
      join public.courses c on c.id=u.course_id
      where t.id=l.topic_id and c.organisation_id=actor.organisation_id
    ) returning l.id into saved_uuid;
    if saved_uuid is null then raise exception 'lesson_not_available' using errcode='42501'; end if;
  end if;

  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'lesson.saved','lesson',saved_uuid,
    jsonb_build_object('title',title_value,'status',status_value));
  return saved_uuid;
end $$;

create function public.teacher_create_question(
  activity_uuid uuid,
  skill_uuid uuid,
  kind_value text,
  pathway_value text,
  question_value text,
  correct_value jsonb,
  alternatives_value jsonb,
  explanation_value text,
  feedback_correct_value text,
  feedback_incorrect_value text,
  hint_value text,
  marks_value numeric,
  seconds_value integer,
  options_value jsonb,
  status_value text
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare
  actor public.user_profiles;
  hierarchy record;
  question_uuid uuid;
  option_value text;
  next_order integer;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role in ('teacher','administrator') and archived_at is null;
  if actor.id is null then raise exception 'not_authorised' using errcode='42501'; end if;
  if status_value not in ('draft','approved') or marks_value <= 0 or length(trim(question_value)) < 5 then
    raise exception 'invalid_question' using errcode='22023';
  end if;
  select c.id course_id,u.id unit_id,t.learning_aim_id,t.id topic_id into hierarchy
  from public.activities a join public.lessons l on l.id=a.lesson_id
  join public.topics t on t.id=l.topic_id join public.units u on u.id=t.unit_id
  join public.courses c on c.id=u.course_id join public.skills s on s.topic_id=t.id
  where a.id=activity_uuid and s.id=skill_uuid and c.organisation_id=actor.organisation_id;
  if not found then raise exception 'activity_or_skill_not_available' using errcode='42501'; end if;

  insert into public.questions(
    course_id,unit_id,learning_aim_id,topic_id,skill_id,difficulty,pathway,kind,
    question_text,correct_answer,acceptable_answers,feedback_correct,feedback_incorrect,
    explanation,hint,marks,estimated_seconds,status,authored_by,approved_by,approved_at
  ) values(
    hierarchy.course_id,hierarchy.unit_id,hierarchy.learning_aim_id,hierarchy.topic_id,skill_uuid,
    pathway_value::public.pathway,pathway_value::public.pathway,kind_value::public.question_kind,
    trim(question_value),correct_value,coalesce(alternatives_value,'[]'::jsonb),
    trim(feedback_correct_value),trim(feedback_incorrect_value),trim(explanation_value),
    nullif(trim(hint_value),''),marks_value,seconds_value,status_value::public.content_status,
    actor.id,case when status_value='approved' then actor.id end,
    case when status_value='approved' then now() end
  ) returning id into question_uuid;
  select coalesce(max(sort_order),0)+1 into next_order from public.activity_questions where activity_id=activity_uuid;
  insert into public.activity_questions(activity_id,question_id,sort_order) values(activity_uuid,question_uuid,next_order);
  if jsonb_typeof(options_value)='array' then
    for option_value in select jsonb_array_elements_text(options_value) loop
      insert into public.question_options(question_id,option_text,sort_order)
      values(question_uuid,option_value,(select count(*)+1 from public.question_options where question_id=question_uuid));
    end loop;
  end if;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'question.created','question',question_uuid,
    jsonb_build_object('activity_id',activity_uuid,'status',status_value));
  return question_uuid;
end $$;

create function public.teacher_set_content_status(
  entity_value text,
  entity_uuid uuid,
  status_value text
) returns void
language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; changed integer;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role in ('teacher','administrator') and archived_at is null;
  if actor.id is null then raise exception 'not_authorised' using errcode='42501'; end if;
  if status_value not in ('draft','approved','archived') then raise exception 'invalid_status' using errcode='22023'; end if;
  if entity_value='lesson' then
    update public.lessons l set status=status_value::public.content_status,updated_at=now(),
      approved_by=case when status_value='approved' then actor.id else approved_by end,
      approved_at=case when status_value='approved' then now() else approved_at end,
      archived_at=case when status_value='archived' then coalesce(archived_at,now()) else null end
    where l.id=entity_uuid and exists(select 1 from public.topics t join public.units u on u.id=t.unit_id join public.courses c on c.id=u.course_id where t.id=l.topic_id and c.organisation_id=actor.organisation_id);
  elsif entity_value='activity' then
    update public.activities a set status=status_value::public.content_status,
      approved_by=case when status_value='approved' then actor.id else approved_by end,
      approved_at=case when status_value='approved' then now() else approved_at end,
      archived_at=case when status_value='archived' then coalesce(archived_at,now()) else null end
    where a.id=entity_uuid and exists(select 1 from public.lessons l join public.topics t on t.id=l.topic_id join public.units u on u.id=t.unit_id join public.courses c on c.id=u.course_id where l.id=a.lesson_id and c.organisation_id=actor.organisation_id);
  elsif entity_value='question' then
    update public.questions q set status=status_value::public.content_status,updated_at=now(),
      approved_by=case when status_value='approved' then actor.id else approved_by end,
      approved_at=case when status_value='approved' then now() else approved_at end,
      archived_at=case when status_value='archived' then coalesce(archived_at,now()) else null end
    where q.id=entity_uuid and exists(select 1 from public.courses c where c.id=q.course_id and c.organisation_id=actor.organisation_id);
  else raise exception 'invalid_entity' using errcode='22023';
  end if;
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'content_not_available' using errcode='42501'; end if;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'content.status_changed',entity_value,entity_uuid,jsonb_build_object('status',status_value));
end $$;

create function public.teacher_allocate_activity(
  activity_uuid uuid,
  class_uuid uuid,
  learner_uuid uuid,
  pathway_value text,
  release_value timestamptz,
  deadline_value timestamptz,
  required_value boolean
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; allocation_uuid uuid;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role in ('teacher','administrator') and archived_at is null;
  if actor.id is null or ((class_uuid is null)::integer+(learner_uuid is null)::integer)<>1 then
    raise exception 'invalid_allocation' using errcode='22023';
  end if;
  if class_uuid is not null and not public.can_access_class(class_uuid) then raise exception 'not_authorised' using errcode='42501'; end if;
  if learner_uuid is not null and not public.can_access_learner(learner_uuid) then raise exception 'not_authorised' using errcode='42501'; end if;
  if not exists(
    select 1 from public.activities a join public.lessons l on l.id=a.lesson_id
    join public.topics t on t.id=l.topic_id join public.units u on u.id=t.unit_id
    join public.courses c on c.id=u.course_id
    where a.id=activity_uuid and c.organisation_id=actor.organisation_id
  ) then raise exception 'activity_not_available' using errcode='42501'; end if;
  insert into public.activity_allocations(activity_id,class_id,learner_id,allocated_pathway,release_at,deadline_at,required,allocated_by)
  values(activity_uuid,class_uuid,learner_uuid,pathway_value::public.pathway,release_value,deadline_value,required_value,actor.id)
  returning id into allocation_uuid;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'activity.allocated','activity_allocation',allocation_uuid,
    jsonb_build_object('activity_id',activity_uuid,'class_id',class_uuid,'learner_id',learner_uuid));
  return allocation_uuid;
end $$;

create function public.teacher_adjust_coins(
  learner_uuid uuid,
  amount_value integer,
  note_value text
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; transaction_uuid uuid;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role in ('teacher','administrator') and archived_at is null;
  if actor.id is null or not public.can_access_learner(learner_uuid) then raise exception 'not_authorised' using errcode='42501'; end if;
  if amount_value=0 or abs(amount_value)>500 or length(trim(note_value))<5 then raise exception 'invalid_correction' using errcode='22023'; end if;
  insert into public.coin_transactions(learner_id,amount,reason,description,idempotency_key,created_by,metadata)
  values(learner_uuid,amount_value,'teacher_correction',trim(note_value),
    format('teacher:%s:%s',actor.id,gen_random_uuid()),actor.id,jsonb_build_object('teacher_note',trim(note_value)))
  returning id into transaction_uuid;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'coins.corrected','coin_transaction',transaction_uuid,
    jsonb_build_object('learner_id',learner_uuid,'amount',amount_value,'note',trim(note_value)));
  return transaction_uuid;
end $$;

create function public.teacher_set_gamification(
  class_uuid uuid,
  learner_uuid uuid,
  badges_value boolean,
  coins_value boolean,
  streaks_value boolean
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; setting_uuid uuid;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role in ('teacher','administrator') and archived_at is null;
  if actor.id is null or ((class_uuid is not null)::integer+(learner_uuid is not null)::integer)>1 then
    raise exception 'invalid_setting' using errcode='22023';
  end if;
  if class_uuid is not null and not public.can_access_class(class_uuid) then raise exception 'not_authorised' using errcode='42501'; end if;
  if learner_uuid is not null and not public.can_access_learner(learner_uuid) then raise exception 'not_authorised' using errcode='42501'; end if;
  select id into setting_uuid from public.gamification_settings
    where organisation_id=actor.organisation_id
      and class_id is not distinct from class_uuid and learner_id is not distinct from learner_uuid;
  if setting_uuid is null then
    insert into public.gamification_settings(
      organisation_id,class_id,learner_id,badges_enabled,coins_enabled,streaks_enabled,updated_by
    ) values(actor.organisation_id,class_uuid,learner_uuid,badges_value,coins_value,streaks_value,actor.id)
    returning id into setting_uuid;
  else
    update public.gamification_settings set badges_enabled=badges_value,coins_enabled=coins_value,
      streaks_enabled=streaks_value,updated_by=actor.id,updated_at=now() where id=setting_uuid;
  end if;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'gamification.updated','gamification_setting',setting_uuid,
    jsonb_build_object('class_id',class_uuid,'learner_id',learner_uuid,'badges',badges_value,'coins',coins_value,'streaks',streaks_value));
  return setting_uuid;
end $$;

create function public.teacher_update_target(
  target_uuid uuid,
  status_value text,
  target_text_value text,
  note_value text
) returns void
language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; target_learner uuid; changed integer;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role in ('teacher','administrator') and archived_at is null;
  select learner_id into target_learner from public.targets where id=target_uuid and archived_at is null;
  if actor.id is null or target_learner is null or not public.can_access_learner(target_learner) then
    raise exception 'not_authorised' using errcode='42501';
  end if;
  if status_value not in ('proposed','active','achieved','partially_achieved','not_achieved','replaced','archived')
    or length(trim(target_text_value))<10 then raise exception 'invalid_target' using errcode='22023';
  end if;
  update public.targets set target_text=trim(target_text_value),status=status_value::public.target_status,
    teacher_note=nullif(trim(note_value),''),
    approved_by=case when status_value='active' then actor.id else approved_by end,
    approved_at=case when status_value='active' then now() else approved_at end,
    archived_at=case when status_value='archived' then now() else null end
  where id=target_uuid;
  get diagnostics changed = row_count;
  if changed<>1 then raise exception 'target_not_available' using errcode='42501'; end if;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'target.updated','target',target_uuid,
    jsonb_build_object('status',status_value,'text',trim(target_text_value),'note',nullif(trim(note_value),'')));
end $$;

revoke all on function public.teacher_save_lesson(uuid,uuid,integer,text,text,text,text,text,text,jsonb,integer,text) from public;
revoke all on function public.teacher_create_question(uuid,uuid,text,text,text,jsonb,jsonb,text,text,text,text,numeric,integer,jsonb,text) from public;
revoke all on function public.teacher_set_content_status(text,uuid,text) from public;
revoke all on function public.teacher_allocate_activity(uuid,uuid,uuid,text,timestamptz,timestamptz,boolean) from public;
revoke all on function public.teacher_adjust_coins(uuid,integer,text) from public;
revoke all on function public.teacher_set_gamification(uuid,uuid,boolean,boolean,boolean) from public;
revoke all on function public.teacher_update_target(uuid,text,text,text) from public;
grant execute on function public.teacher_save_lesson(uuid,uuid,integer,text,text,text,text,text,text,jsonb,integer,text) to authenticated;
grant execute on function public.teacher_create_question(uuid,uuid,text,text,text,jsonb,jsonb,text,text,text,text,numeric,integer,jsonb,text) to authenticated;
grant execute on function public.teacher_set_content_status(text,uuid,text) to authenticated;
grant execute on function public.teacher_allocate_activity(uuid,uuid,uuid,text,timestamptz,timestamptz,boolean) to authenticated;
grant execute on function public.teacher_adjust_coins(uuid,integer,text) to authenticated;
grant execute on function public.teacher_set_gamification(uuid,uuid,boolean,boolean,boolean) to authenticated;
grant execute on function public.teacher_update_target(uuid,text,text,text) to authenticated;
