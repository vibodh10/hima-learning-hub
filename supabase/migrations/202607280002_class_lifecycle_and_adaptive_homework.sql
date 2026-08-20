-- Class lifecycle and learner-specific adaptive homework.

create or replace function public.teacher_duplicate_class(
  source_class_uuid uuid,new_name text,enrolment_code text
) returns uuid language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; source_row public.classes; created_uuid uuid;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role in ('teacher','administrator') and archived_at is null;
  if actor.id is null or not public.can_manage_class(source_class_uuid)
    or length(trim(new_name))<2 or length(trim(enrolment_code))<6 then
    raise exception 'invalid_class_duplicate' using errcode='22023';
  end if;
  select * into source_row from public.classes where id=source_class_uuid and archived_at is null;
  insert into public.classes(
    organisation_id,academic_year_id,academic_period_id,course_id,teacher_id,name,
    enrolment_code_hash,enrolment_code_hint,active_unit_id,starts_on,ends_on,
    weekly_learning_day,published,settings
  ) values(
    source_row.organisation_id,source_row.academic_year_id,source_row.academic_period_id,
    source_row.course_id,actor.id,trim(new_name),
    extensions.crypt(upper(trim(enrolment_code)),extensions.gen_salt('bf')),
    right(upper(trim(enrolment_code)),2),source_row.active_unit_id,source_row.starts_on,
    source_row.ends_on,source_row.weekly_learning_day,false,source_row.settings
  ) returning id into created_uuid;
  insert into public.class_units(class_id,unit_id,active,selected_by)
    select created_uuid,unit_id,active,actor.id from public.class_units
    where class_id=source_class_uuid and archived_at is null;
  insert into public.class_teachers(class_id,teacher_id,is_lead)
  values(created_uuid,actor.id,true);
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'class.duplicated','class',created_uuid,
    jsonb_build_object('source_class_id',source_class_uuid,'name',trim(new_name)));
  return created_uuid;
end $$;

create or replace function public.teacher_add_class_teacher(
  class_uuid uuid,teacher_uuid uuid,is_lead_value boolean default false
) returns void language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role in ('teacher','administrator') and archived_at is null;
  if actor.id is null or not public.can_manage_class(class_uuid)
    or not exists(select 1 from public.user_profiles p join public.classes c
      on c.organisation_id=p.organisation_id where c.id=class_uuid and p.id=teacher_uuid
        and p.role in ('teacher','administrator') and p.archived_at is null) then
    raise exception 'not_authorised' using errcode='42501';
  end if;
  insert into public.class_teachers(class_id,teacher_id,is_lead)
  values(class_uuid,teacher_uuid,is_lead_value)
  on conflict(class_id,teacher_id) do update set
    is_lead=excluded.is_lead,archived_at=null,added_at=now();
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'class.teacher_added','class',class_uuid,
    jsonb_build_object('teacher_id',teacher_uuid,'is_lead',is_lead_value));
end $$;

create or replace function public.teacher_import_existing_students(
  class_uuid uuid,emails_value text[],filename_value text
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  actor public.user_profiles;
  email_value text;
  learner_uuid uuid;
  imported integer:=0;
  failures jsonb:='[]';
  batch_uuid uuid;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role in ('teacher','administrator') and archived_at is null;
  if actor.id is null or not public.can_manage_class(class_uuid)
    or cardinality(emails_value)<1 or cardinality(emails_value)>500 then
    raise exception 'invalid_student_import' using errcode='22023';
  end if;
  foreach email_value in array emails_value loop
    email_value:=lower(trim(email_value));
    select p.id into learner_uuid from auth.users u join public.user_profiles p on p.id=u.id
      where lower(u.email)=email_value and p.organisation_id=actor.organisation_id
        and p.role='student' and p.archived_at is null;
    if learner_uuid is null then
      failures:=failures||jsonb_build_array(jsonb_build_object(
        'email',email_value,'error','No active learner account in this organisation'
      ));
    else
      insert into public.enrolments(class_id,student_id,archived_at)
      values(class_uuid,learner_uuid,null)
      on conflict(class_id,student_id) do update set archived_at=null,enrolled_at=now();
      imported:=imported+1;
    end if;
    learner_uuid:=null;
  end loop;
  insert into public.student_import_batches(
    class_id,imported_by,filename,row_count,succeeded_count,failed_count,errors
  ) values(class_uuid,actor.id,coalesce(nullif(trim(filename_value),''),'student-import.csv'),
    cardinality(emails_value),imported,jsonb_array_length(failures),failures)
  returning id into batch_uuid;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'students.imported','student_import_batch',batch_uuid,
    jsonb_build_object('class_id',class_uuid,'imported',imported,'failures',failures));
  return jsonb_build_object('batchId',batch_uuid,'imported',imported,'failures',failures);
end $$;

create or replace function public.teacher_allocate_adaptive_homework(
  topic_uuid uuid,
  class_uuid uuid,
  learner_uuid uuid,
  pathway_mode text,
  release_value timestamptz,
  deadline_value timestamptz,
  expected_minutes_value integer,
  required_value boolean
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  actor public.user_profiles;
  learner_row record;
  selected_pathway public.pathway;
  selected_stage public.learning_stage;
  activity_uuid uuid;
  allocation_uuid uuid;
  allocations jsonb:='[]';
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role in ('teacher','administrator') and archived_at is null;
  if actor.id is null or (class_uuid is null and learner_uuid is null)
    or (class_uuid is not null and not public.can_manage_class(class_uuid))
    or (learner_uuid is not null and not public.can_access_learner(learner_uuid))
    or pathway_mode not in ('Auto','Support','Core','Stretch','Mastery')
    or deadline_value<=release_value or expected_minutes_value not between 5 and 120 then
    raise exception 'invalid_adaptive_homework' using errcode='22023';
  end if;
  if not exists(select 1 from public.topics t join public.units u on u.id=t.unit_id
      join public.courses c on c.id=u.course_id
      where t.id=topic_uuid and c.organisation_id=actor.organisation_id) then
    raise exception 'topic_not_available' using errcode='42501';
  end if;

  for learner_row in
    select distinct p.id learner_id from public.user_profiles p
    where (learner_uuid is not null and p.id=learner_uuid)
      or (class_uuid is not null and exists(select 1 from public.enrolments e
        where e.class_id=class_uuid and e.student_id=p.id and e.archived_at is null))
  loop
    if pathway_mode='Auto' then
      select coalesce((
        select sm.current_pathway from public.skill_mastery sm join public.skills s on s.id=sm.skill_id
        where sm.learner_id=learner_row.learner_id and s.topic_id=topic_uuid
        order by sm.mastery_score asc limit 1
      ),'Support'::public.pathway) into selected_pathway;
    else selected_pathway:=pathway_mode::public.pathway;
    end if;
    selected_stage:=case selected_pathway
      when 'Support' then 'guided_practice'::public.learning_stage
      when 'Core' then 'core_practice'::public.learning_stage
      when 'Stretch' then 'challenge_practice'::public.learning_stage
      else 'mastery_check'::public.learning_stage end;
    select a.id into activity_uuid from public.activities a join public.lessons l on l.id=a.lesson_id
      where l.topic_id=topic_uuid and a.learning_stage=selected_stage
        and a.status='approved' and a.archived_at is null
      order by a.estimated_minutes limit 1;
    if activity_uuid is null then
      select a.id into activity_uuid from public.activities a join public.lessons l on l.id=a.lesson_id
        where l.topic_id=topic_uuid and a.learning_stage='core_practice'
          and a.status='approved' and a.archived_at is null limit 1;
    end if;
    if activity_uuid is null then raise exception 'approved_homework_not_available' using errcode='22023'; end if;
    insert into public.activity_allocations(
      activity_id,learner_id,allocated_pathway,release_at,deadline_at,required,
      allocated_by,allocation_mode,expected_minutes
    ) values(
      activity_uuid,learner_row.learner_id,selected_pathway,release_value,deadline_value,
      required_value,actor.id,case when pathway_mode='Auto' then 'auto' else 'manual' end,
      expected_minutes_value
    ) returning id into allocation_uuid;
    allocations:=allocations||jsonb_build_array(jsonb_build_object(
      'allocationId',allocation_uuid,'learnerId',learner_row.learner_id,
      'activityId',activity_uuid,'pathway',selected_pathway
    ));
  end loop;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,after_data)
  values(actor.organisation_id,actor.id,'adaptive_homework.allocated','activity_allocation',
    jsonb_build_object('class_id',class_uuid,'learner_id',learner_uuid,
      'topic_id',topic_uuid,'mode',pathway_mode,'allocations',allocations));
  return jsonb_build_object('count',jsonb_array_length(allocations),'allocations',allocations);
end $$;

revoke all on function public.teacher_duplicate_class(uuid,text,text) from public;
revoke all on function public.teacher_add_class_teacher(uuid,uuid,boolean) from public;
revoke all on function public.teacher_import_existing_students(uuid,text[],text) from public;
revoke all on function public.teacher_allocate_adaptive_homework(uuid,uuid,uuid,text,timestamptz,timestamptz,integer,boolean) from public;
grant execute on function public.teacher_duplicate_class(uuid,text,text) to authenticated;
grant execute on function public.teacher_add_class_teacher(uuid,uuid,boolean) to authenticated;
grant execute on function public.teacher_import_existing_students(uuid,text[],text) to authenticated;
grant execute on function public.teacher_allocate_adaptive_homework(uuid,uuid,uuid,text,timestamptz,timestamptz,integer,boolean) to authenticated;
