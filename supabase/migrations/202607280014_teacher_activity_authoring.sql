create or replace function public.teacher_create_assessment_blueprint(
  curriculum_version_uuid uuid,
  unit_uuid uuid,
  title_value text,
  scope_value text,
  status_value text
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare actor public.user_profiles; blueprint_uuid uuid;
begin
  select * into actor from public.user_profiles
  where id=auth.uid() and role in ('teacher','administrator') and archived_at is null;
  if actor.id is null
    or length(trim(title_value))<3
    or scope_value not in ('course_starting_point','unit_starting_point','progress_point','retention_check')
    or status_value not in ('draft','approved')
    or not exists(
      select 1 from public.curriculum_versions cv
      join public.courses c on c.id=cv.course_id
      where cv.id=curriculum_version_uuid
        and c.organisation_id=actor.organisation_id
        and (unit_uuid is null or exists(select 1 from public.units u
          where u.id=unit_uuid and u.course_id=c.id))
    ) then
    raise exception 'invalid_assessment_blueprint' using errcode='22023';
  end if;
  if scope_value<>'course_starting_point' and unit_uuid is null then
    raise exception 'unit_required' using errcode='22023';
  end if;
  insert into public.assessment_blueprints(
    curriculum_version_id,unit_id,title,scope,status,created_by,approved_by,approved_at
  ) values(
    curriculum_version_uuid,unit_uuid,trim(title_value),scope_value,
    status_value::public.content_status,actor.id,
    case when status_value='approved' then actor.id end,
    case when status_value='approved' then now() end
  ) returning id into blueprint_uuid;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'assessment_blueprint.created','assessment_blueprint',blueprint_uuid,
    jsonb_build_object('scope',scope_value,'unit_id',unit_uuid,'status',status_value));
  return blueprint_uuid;
end $$;

create or replace function public.teacher_create_activity(
  lesson_uuid uuid,
  title_value text,
  kind_value text,
  stage_value text,
  pathway_value text,
  estimated_minutes_value integer,
  max_attempts_value integer,
  required_value boolean,
  automatic_marking_value boolean,
  status_value text,
  instructions_value text,
  home_session_value integer,
  assessment_kind_value text,
  blueprint_uuid uuid
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare actor public.user_profiles; activity_uuid uuid;
begin
  select * into actor from public.user_profiles
  where id=auth.uid() and role in ('teacher','administrator') and archived_at is null;
  if actor.id is null
    or length(trim(title_value))<3
    or kind_value not in ('in_class_learning','in_class_practice','homework','revision','holiday_work','skills_practice','review_check')
    or stage_value not in ('learn','worked_example','guided_practice','core_practice','challenge_practice','mastery_check','retrieval_review')
    or pathway_value not in ('Support','Core','Stretch','Mastery')
    or status_value not in ('draft','approved')
    or estimated_minutes_value not between 1 and 240
    or max_attempts_value not between 1 and 20
    or (home_session_value is not null and home_session_value not between 1 and 20)
    or not exists(
      select 1 from public.lessons l
      join public.topics t on t.id=l.topic_id
      join public.units u on u.id=t.unit_id
      join public.courses c on c.id=u.course_id
      where l.id=lesson_uuid and c.organisation_id=actor.organisation_id
    ) then
    raise exception 'invalid_activity' using errcode='22023';
  end if;
  if nullif(assessment_kind_value,'') is not null and (
    assessment_kind_value not in ('course_starting_point','unit_starting_point','progress_point','retention_check')
    or blueprint_uuid is null
    or not exists(select 1 from public.assessment_blueprints b
      where b.id=blueprint_uuid and b.scope=assessment_kind_value and b.status='approved')
  ) then raise exception 'invalid_assessment_mapping' using errcode='22023'; end if;

  insert into public.activities(
    lesson_id,title,kind,pathway,estimated_minutes,max_attempts,required,
    automatic_marking,learning_stage,status,instructions,home_session_number,
    assessment_kind,blueprint_id,approved_by,approved_at
  ) values(
    lesson_uuid,trim(title_value),kind_value::public.activity_kind,
    pathway_value::public.pathway,estimated_minutes_value,max_attempts_value,
    required_value,automatic_marking_value,stage_value::public.learning_stage,
    status_value::public.content_status,nullif(trim(instructions_value),''),
    home_session_value,nullif(assessment_kind_value,''),blueprint_uuid,
    case when status_value='approved' then actor.id end,
    case when status_value='approved' then now() end
  ) returning id into activity_uuid;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'activity.created','activity',activity_uuid,
    jsonb_build_object('lesson_id',lesson_uuid,'kind',kind_value,'stage',stage_value,
      'assessment_kind',nullif(assessment_kind_value,''),'status',status_value));
  return activity_uuid;
end $$;

revoke all on function public.teacher_create_assessment_blueprint(uuid,uuid,text,text,text) from public;
revoke all on function public.teacher_create_activity(uuid,text,text,text,text,integer,integer,boolean,boolean,text,text,integer,text,uuid) from public;
grant execute on function public.teacher_create_assessment_blueprint(uuid,uuid,text,text,text) to authenticated;
grant execute on function public.teacher_create_activity(uuid,text,text,text,text,integer,integer,boolean,boolean,text,text,integer,text,uuid) to authenticated;

