create or replace function public.teacher_review_question(
  question_uuid uuid,
  question_value text,
  correct_value jsonb,
  alternatives_value jsonb,
  explanation_value text,
  feedback_correct_value text,
  feedback_incorrect_value text,
  hint_value text,
  marks_value numeric,
  seconds_value integer,
  pathway_value text,
  status_value text,
  blueprint_uuid uuid,
  blueprint_category_value text,
  tags_value text[],
  misconception_uuids uuid[],
  options_value jsonb
) returns void
language plpgsql
security definer
set search_path=''
as $$
declare actor public.user_profiles; question_row public.questions; option_value text;
begin
  select * into actor from public.user_profiles
  where id=auth.uid() and role in ('teacher','administrator') and archived_at is null;
  select q.* into question_row from public.questions q
  join public.courses c on c.id=q.course_id
  where q.id=question_uuid and c.organisation_id=actor.organisation_id
    and q.archived_at is null;
  if actor.id is null or question_row.id is null
    or length(trim(question_value))<5 or length(trim(explanation_value))<5
    or marks_value<=0 or seconds_value not between 10 and 3600
    or pathway_value not in ('Support','Core','Stretch','Mastery')
    or status_value not in ('draft','approved') then
    raise exception 'invalid_question_review' using errcode='22023';
  end if;
  if blueprint_uuid is not null and not exists(
    select 1 from public.assessment_blueprints b
    join public.curriculum_versions cv on cv.id=b.curriculum_version_id
    where b.id=blueprint_uuid and b.status='approved'
      and cv.course_id=question_row.course_id
      and (b.unit_id is null or b.unit_id=question_row.unit_id)
  ) then raise exception 'invalid_blueprint' using errcode='22023'; end if;
  if exists(select 1 from unnest(coalesce(misconception_uuids,'{}'::uuid[])) m(id)
    where not exists(select 1 from public.misconceptions x
      where x.id=m.id and x.skill_id=question_row.skill_id)) then
    raise exception 'invalid_misconception_mapping' using errcode='22023';
  end if;

  update public.questions set
    question_text=trim(question_value),
    correct_answer=coalesce(correct_value,correct_answer),
    acceptable_answers=coalesce(alternatives_value,acceptable_answers),
    explanation=trim(explanation_value),
    feedback_correct=trim(feedback_correct_value),
    feedback_incorrect=trim(feedback_incorrect_value),
    hint=nullif(trim(hint_value),''),
    marks=marks_value,estimated_seconds=seconds_value,
    difficulty=pathway_value::public.pathway,pathway=pathway_value::public.pathway,
    status=status_value::public.content_status,
    blueprint_id=blueprint_uuid,
    blueprint_category=nullif(trim(blueprint_category_value),''),
    tags=coalesce(tags_value,'{}'::text[]),
    approved_by=case when status_value='approved' then actor.id else approved_by end,
    approved_at=case when status_value='approved' then now() else approved_at end,
    updated_at=now()
  where id=question_uuid;

  delete from public.question_misconceptions where question_id=question_uuid;
  insert into public.question_misconceptions(question_id,misconception_id)
  select question_uuid,m.id
  from unnest(coalesce(misconception_uuids,'{}'::uuid[])) as m(id);

  if options_value is not null and jsonb_typeof(options_value)='array' then
    delete from public.question_options where question_id=question_uuid;
    for option_value in select jsonb_array_elements_text(options_value) loop
      insert into public.question_options(question_id,option_text,sort_order)
      values(question_uuid,option_value,
        (select count(*)+1 from public.question_options where question_id=question_uuid));
    end loop;
  end if;

  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'question.reviewed','question',question_uuid,
    jsonb_build_object('status',status_value,'blueprint_id',blueprint_uuid,
      'blueprint_category',nullif(trim(blueprint_category_value),''),
      'misconception_ids',coalesce(to_jsonb(misconception_uuids),'[]'::jsonb)));
end $$;

revoke all on function public.teacher_review_question(uuid,text,jsonb,jsonb,text,text,text,text,numeric,integer,text,text,uuid,text,text[],uuid[],jsonb) from public;
grant execute on function public.teacher_review_question(uuid,text,jsonb,jsonb,text,text,text,text,numeric,integer,text,text,uuid,text,text[],uuid[],jsonb) to authenticated;
