-- Complete learning/progress foundation for curriculum versions, editable
-- multi-unit classes, baseline/progress evidence, adaptive routes and snapshots.

alter table public.courses
  add column if not exists qualification_type text,
  add column if not exists qualification_level text,
  add column if not exists awarding_organisation text,
  add column if not exists qualification_number text,
  add column if not exists teacher_notes text,
  add column if not exists active boolean not null default true,
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.curriculum_versions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id),
  version_label text not null,
  specification_year integer not null,
  source_reference text,
  teacher_notes text,
  active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique(course_id,version_label),
  check(specification_year between 2000 and 2200)
);

alter table public.units
  add column if not exists curriculum_version_id uuid references public.curriculum_versions(id),
  add column if not exists kind text not null default 'unit',
  add column if not exists initial_teaching boolean not null default false,
  add constraint units_kind_check check(kind in ('unit','content_area','occupational_specialism'));

create table if not exists public.academic_periods (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id),
  name text not null,
  kind text not null,
  starts_on date not null,
  ends_on date not null,
  archived_at timestamptz,
  unique(academic_year_id,name),
  check(kind in ('term','semester')),
  check(ends_on>starts_on)
);

create table if not exists public.academic_calendar_events (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id),
  academic_period_id uuid references public.academic_periods(id),
  title text not null,
  kind text not null,
  starts_on date not null,
  ends_on date not null,
  metadata jsonb not null default '{}',
  check(kind in ('holiday','teaching_week','progress_point_week','review_week','examination_reminder')),
  check(ends_on>=starts_on)
);

alter table public.classes
  add column if not exists academic_period_id uuid references public.academic_periods(id),
  add column if not exists active_unit_id uuid references public.units(id),
  add column if not exists starts_on date,
  add column if not exists ends_on date,
  add column if not exists weekly_learning_day integer,
  add column if not exists published boolean not null default false,
  add column if not exists settings jsonb not null default '{}',
  add constraint classes_weekday_check check(weekly_learning_day is null or weekly_learning_day between 1 and 7),
  add constraint classes_dates_check check(ends_on is null or starts_on is null or ends_on>=starts_on);

create table if not exists public.class_teachers (
  class_id uuid not null references public.classes(id),
  teacher_id uuid not null references public.user_profiles(id),
  is_lead boolean not null default false,
  added_at timestamptz not null default now(),
  archived_at timestamptz,
  primary key(class_id,teacher_id)
);

create table if not exists public.class_units (
  class_id uuid not null references public.classes(id),
  unit_id uuid not null references public.units(id),
  active boolean not null default true,
  selected_at timestamptz not null default now(),
  selected_by uuid references public.user_profiles(id),
  archived_at timestamptz,
  primary key(class_id,unit_id)
);

create table if not exists public.assessment_blueprints (
  id uuid primary key default gen_random_uuid(),
  curriculum_version_id uuid not null references public.curriculum_versions(id),
  unit_id uuid references public.units(id),
  title text not null,
  scope text not null,
  status public.content_status not null default 'draft',
  created_by uuid references public.user_profiles(id),
  approved_by uuid references public.user_profiles(id),
  approved_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  check(scope in ('course_starting_point','unit_starting_point','progress_point','retention_check'))
);

alter table public.questions
  add column if not exists curriculum_version_id uuid references public.curriculum_versions(id),
  add column if not exists blueprint_id uuid references public.assessment_blueprints(id),
  add column if not exists blueprint_category text;

create table if not exists public.assessment_instances (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.user_profiles(id),
  class_id uuid not null references public.classes(id),
  blueprint_id uuid not null references public.assessment_blueprints(id),
  attempt_id uuid unique references public.attempts(id),
  activity_id uuid references public.activities(id),
  kind text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  confidence_before integer,
  confidence_after integer,
  prior_experience jsonb not null default '{}',
  support_needs text,
  aspirations text,
  immutable boolean not null default true,
  check(kind in ('course_starting_point','unit_starting_point','progress_point','retention_check')),
  check(confidence_before is null or confidence_before between 1 and 5),
  check(confidence_after is null or confidence_after between 1 and 5)
);

alter table public.activities
  add column if not exists assessment_kind text,
  add column if not exists blueprint_id uuid references public.assessment_blueprints(id),
  add constraint activities_assessment_kind_check check(
    assessment_kind is null or assessment_kind in (
      'course_starting_point','unit_starting_point','progress_point','retention_check'
    )
  );

create table if not exists public.assessment_skill_results (
  id uuid primary key default gen_random_uuid(),
  assessment_instance_id uuid not null references public.assessment_instances(id),
  skill_id uuid not null references public.skills(id),
  question_type public.question_kind,
  difficulty public.pathway not null,
  mark numeric(8,2) not null,
  max_mark numeric(8,2) not null,
  percentage numeric(5,2) not null,
  hints_used integer not null default 0,
  active_seconds integer,
  first_attempt boolean not null default true,
  equivalent_evidence boolean not null default false,
  created_at timestamptz not null default now(),
  unique(assessment_instance_id,skill_id,question_type,difficulty),
  check(max_mark>0 and mark>=0 and mark<=max_mark),
  check(percentage between 0 and 100)
);

create table if not exists public.skill_progress_comparisons (
  learner_id uuid not null references public.user_profiles(id),
  skill_id uuid not null references public.skills(id),
  starting_result_id uuid not null references public.assessment_skill_results(id),
  latest_progress_result_id uuid references public.assessment_skill_results(id),
  retention_result_id uuid references public.assessment_skill_results(id),
  starting_percentage numeric(5,2) not null,
  latest_percentage numeric(5,2),
  improvement_points numeric(6,2),
  status text not null default 'Insufficient Evidence',
  confidence_change integer,
  evidence jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key(learner_id,skill_id),
  check(status in (
    'Significant Improvement','Improving','Secure','Mastered',
    'No Clear Improvement','Declining','Insufficient Evidence'
  ))
);

create table if not exists public.pathway_thresholds (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  class_id uuid references public.classes(id),
  support_max numeric(5,2) not null default 49.99,
  core_max numeric(5,2) not null default 69.99,
  stretch_max numeric(5,2) not null default 84.99,
  hints_weight numeric(5,2) not null default 4,
  repeated_error_weight numeric(5,2) not null default 2,
  confidence_weight numeric(5,2) not null default 2,
  retention_weight numeric(5,2) not null default 15,
  updated_by uuid references public.user_profiles(id),
  updated_at timestamptz not null default now(),
  check(support_max<core_max and core_max<stretch_max and stretch_max<100)
);

create table if not exists public.pathway_overrides (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.user_profiles(id),
  skill_id uuid references public.skills(id),
  topic_id uuid references public.topics(id),
  previous_pathway public.pathway not null,
  new_pathway public.pathway not null,
  reason text not null,
  review_on date not null,
  teacher_id uuid not null references public.user_profiles(id),
  created_at timestamptz not null default now(),
  reversed_at timestamptz,
  check((skill_id is not null)::integer+(topic_id is not null)::integer=1)
);

create table if not exists public.learner_routes (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.user_profiles(id),
  topic_id uuid not null references public.topics(id),
  route text not null,
  status text not null default 'active',
  selected_by text not null default 'auto',
  evidence jsonb not null default '{}',
  retention_due_on date,
  teacher_id uuid references public.user_profiles(id),
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  check(route in ('Full Path','Reduced Practice','Mastery Check Only','Fast-Tracked','Teacher Override')),
  check(status in ('active','completed','reversed')),
  check(selected_by in ('auto','teacher'))
);

create unique index if not exists learner_routes_one_active_idx
  on public.learner_routes(learner_id,topic_id) where status='active';

create table if not exists public.topic_skip_evidence (
  id uuid primary key default gen_random_uuid(),
  learner_route_id uuid not null references public.learner_routes(id),
  learner_id uuid not null references public.user_profiles(id),
  topic_id uuid not null references public.topics(id),
  evidence jsonb not null,
  prerequisites_secure boolean not null,
  equivalent_questions_secure boolean not null,
  demonstrations_count integer not null,
  hints_acceptable boolean not null,
  completion_time_acceptable boolean not null,
  compulsory boolean not null default false,
  retention_scheduled boolean not null,
  created_at timestamptz not null default now(),
  check(demonstrations_count>=0)
);

create or replace function public.capture_assessment_evidence()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
  activity_row public.activities;
  class_uuid uuid;
  instance_uuid uuid;
  topic_uuid uuid;
  skill_row record;
  starting_row record;
  comparison_status text;
  weakest numeric;
  minimum_attempts integer;
  route_value text;
  route_uuid uuid;
begin
  if new.completed_at is null or old.completed_at is not null then return new; end if;
  select * into activity_row from public.activities where id=new.activity_id;
  if activity_row.assessment_kind is null or activity_row.blueprint_id is null then return new; end if;
  select e.class_id into class_uuid from public.enrolments e
    join public.classes c on c.id=e.class_id
    join public.lessons l on l.id=activity_row.lesson_id
    join public.topics t on t.id=l.topic_id
    join public.units u on u.id=t.unit_id
    where e.student_id=new.learner_id and e.archived_at is null
      and c.course_id=u.course_id and c.archived_at is null
    order by e.enrolled_at desc limit 1;
  if class_uuid is null then return new; end if;
  select topic_id into topic_uuid from public.lessons where id=activity_row.lesson_id;

  insert into public.assessment_instances(
    learner_id,class_id,blueprint_id,attempt_id,activity_id,kind,
    started_at,completed_at,confidence_before,confidence_after
  ) values(
    new.learner_id,class_uuid,activity_row.blueprint_id,new.id,new.activity_id,
    activity_row.assessment_kind,new.started_at,new.completed_at,new.confidence_rating,
    new.confidence_rating
  ) on conflict(attempt_id) do nothing returning id into instance_uuid;
  if instance_uuid is null then return new; end if;

  insert into public.assessment_skill_results(
    assessment_instance_id,skill_id,question_type,difficulty,mark,max_mark,percentage,
    hints_used,active_seconds,first_attempt,equivalent_evidence
  )
  select instance_uuid,aa.skill_id,q.kind,aa.difficulty,sum(aa.mark),sum(aa.max_mark),
    round(sum(aa.mark)/nullif(sum(aa.max_mark),0)*100,2),sum(aa.hints_used),
    extract(epoch from max(aa.completed_at)-min(aa.started_at))::integer,
    new.attempt_number=1,activity_row.assessment_kind in ('progress_point','retention_check')
  from public.attempt_answers aa join public.questions q on q.id=aa.question_id
  where aa.attempt_id=new.id and aa.skill_id is not null
  group by aa.skill_id,q.kind,aa.difficulty;

  if activity_row.assessment_kind='unit_starting_point'
    or activity_row.assessment_kind='course_starting_point' then
    for skill_row in select * from public.assessment_skill_results
      where assessment_instance_id=instance_uuid
    loop
      insert into public.skill_progress_comparisons(
        learner_id,skill_id,starting_result_id,starting_percentage,status,evidence
      ) values(new.learner_id,skill_row.skill_id,skill_row.id,skill_row.percentage,
        'Insufficient Evidence',jsonb_build_object('starting_attempt_id',new.id))
      on conflict(learner_id,skill_id) do nothing;
    end loop;
  elsif activity_row.assessment_kind in ('progress_point','retention_check') then
    for skill_row in select * from public.assessment_skill_results
      where assessment_instance_id=instance_uuid
    loop
      select r.id,r.percentage into starting_row
      from public.assessment_skill_results r join public.assessment_instances i
        on i.id=r.assessment_instance_id
      where i.learner_id=new.learner_id and r.skill_id=skill_row.skill_id
        and i.kind in ('course_starting_point','unit_starting_point')
      order by i.completed_at asc limit 1;
      if starting_row.id is not null then
        comparison_status:=case
          when skill_row.percentage>=85 and skill_row.percentage-starting_row.percentage>=10 then 'Mastered'
          when skill_row.percentage>=70 and skill_row.percentage-starting_row.percentage>=20 then 'Significant Improvement'
          when skill_row.percentage-starting_row.percentage>=5 then 'Improving'
          when skill_row.percentage>=70 then 'Secure'
          when skill_row.percentage-starting_row.percentage<=-10 then 'Declining'
          else 'No Clear Improvement' end;
        insert into public.skill_progress_comparisons(
          learner_id,skill_id,starting_result_id,latest_progress_result_id,
          retention_result_id,starting_percentage,latest_percentage,improvement_points,
          status,evidence,updated_at
        ) values(
          new.learner_id,skill_row.skill_id,starting_row.id,
          case when activity_row.assessment_kind='progress_point' then skill_row.id end,
          case when activity_row.assessment_kind='retention_check' then skill_row.id end,
          starting_row.percentage,skill_row.percentage,
          skill_row.percentage-starting_row.percentage,comparison_status,
          jsonb_build_object('equivalent_question',true,'latest_attempt_id',new.id),now()
        ) on conflict(learner_id,skill_id) do update set
          latest_progress_result_id=case when activity_row.assessment_kind='progress_point'
            then excluded.latest_progress_result_id
            else public.skill_progress_comparisons.latest_progress_result_id end,
          retention_result_id=case when activity_row.assessment_kind='retention_check'
            then excluded.retention_result_id
            else public.skill_progress_comparisons.retention_result_id end,
          latest_percentage=excluded.latest_percentage,
          improvement_points=excluded.improvement_points,status=excluded.status,
          evidence=excluded.evidence,updated_at=now();
      end if;
    end loop;
  end if;

  select min(sm.mastery_score),min(sm.attempts_count) into weakest,minimum_attempts
  from public.skill_mastery sm join public.skills s on s.id=sm.skill_id
  where sm.learner_id=new.learner_id and s.topic_id=topic_uuid;
  route_value:=case
    when weakest>=85 and minimum_attempts>=2 then 'Fast-Tracked'
    when weakest>=70 then 'Reduced Practice'
    when weakest>=60 and activity_row.assessment_kind in ('course_starting_point','unit_starting_point')
      then 'Mastery Check Only'
    else 'Full Path' end;
  update public.learner_routes set status='completed',ended_at=now()
    where learner_id=new.learner_id and topic_id=topic_uuid and status='active';
  insert into public.learner_routes(
    learner_id,topic_id,route,status,selected_by,evidence,retention_due_on
  ) values(
    new.learner_id,topic_uuid,route_value,'active','auto',
    jsonb_build_object('attempt_id',new.id,'weakest_mastery',weakest,
      'minimum_demonstrations',minimum_attempts),
    case when route_value='Fast-Tracked' then current_date+14 end
  ) returning id into route_uuid;
  if route_value='Fast-Tracked' then
    insert into public.topic_skip_evidence(
      learner_route_id,learner_id,topic_id,evidence,prerequisites_secure,
      equivalent_questions_secure,demonstrations_count,hints_acceptable,
      completion_time_acceptable,compulsory,retention_scheduled
    ) values(
      route_uuid,new.learner_id,topic_uuid,
      jsonb_build_object('attempt_id',new.id,'assessment_kind',activity_row.assessment_kind),
      true,activity_row.assessment_kind in ('progress_point','retention_check'),
      minimum_attempts,new.hints_used<=1,
      coalesce(new.active_seconds,activity_row.estimated_minutes*60)<=activity_row.estimated_minutes*90,
      false,true
    );
  end if;
  return new;
end $$;

create trigger capture_assessment_evidence_after_completion
after update of completed_at on public.attempts
for each row execute function public.capture_assessment_evidence();

alter table public.activity_allocations
  add column if not exists allocation_mode text not null default 'manual',
  add column if not exists expected_minutes integer,
  add column if not exists reminder_enabled boolean not null default true,
  add column if not exists pathway_group public.pathway,
  add constraint allocations_mode_check check(allocation_mode in ('manual','auto'));

create table if not exists public.teacher_actions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  teacher_id uuid not null references public.user_profiles(id),
  class_id uuid references public.classes(id),
  learner_id uuid references public.user_profiles(id),
  action text not null,
  reason text not null,
  review_on date,
  outcome text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  check(class_id is not null or learner_id is not null)
);

alter table public.targets
  add column if not exists class_id uuid references public.classes(id),
  add column if not exists course_id uuid references public.courses(id),
  add column if not exists unit_id uuid references public.units(id),
  add column if not exists skill_id uuid references public.skills(id),
  add column if not exists level text not null default 'topic',
  add column if not exists starts_on date not null default current_date,
  add column if not exists review_on date,
  add column if not exists success_measure text,
  add column if not exists current_progress numeric(5,2),
  add column if not exists final_outcome text,
  add column if not exists next_action text,
  add constraint targets_level_check check(level in ('weekly','topic','unit','term_semester'));

create table if not exists public.progress_snapshots (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.user_profiles(id),
  class_id uuid not null references public.classes(id),
  academic_period_id uuid not null references public.academic_periods(id),
  snapshot_data jsonb not null,
  learner_reflection text,
  next_priorities text,
  created_by uuid not null references public.user_profiles(id),
  created_at timestamptz not null default now(),
  unique(learner_id,class_id,academic_period_id)
);

create table if not exists public.student_import_batches (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id),
  imported_by uuid not null references public.user_profiles(id),
  filename text not null,
  row_count integer not null,
  succeeded_count integer not null default 0,
  failed_count integer not null default 0,
  errors jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists public.enrolment_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.user_profiles(id),
  from_class_id uuid references public.classes(id),
  to_class_id uuid references public.classes(id),
  moved_by uuid not null references public.user_profiles(id),
  reason text,
  moved_at timestamptz not null default now()
);

create or replace function public.can_manage_class(class_uuid uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select public.is_admin() or exists(
  select 1 from public.classes c
  left join public.class_teachers ct on ct.class_id=c.id and ct.archived_at is null
  where c.id=class_uuid and c.archived_at is null
    and (c.teacher_id=auth.uid() or ct.teacher_id=auth.uid())
) $$;

create or replace function public.can_access_class(class_uuid uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(
  select 1 from public.classes c join public.user_profiles p on p.id=auth.uid()
  where c.id=class_uuid and c.organisation_id=p.organisation_id
    and c.archived_at is null and (
      p.role='administrator' or c.teacher_id=p.id
      or exists(select 1 from public.class_teachers ct where ct.class_id=c.id and ct.teacher_id=p.id and ct.archived_at is null)
      or exists(select 1 from public.enrolments e where e.class_id=c.id and e.student_id=p.id and e.archived_at is null)
    )
) $$;

create or replace function public.can_access_learner(learner_uuid uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select auth.uid()=learner_uuid or public.is_admin() or exists(
  select 1 from public.enrolments e join public.classes c on c.id=e.class_id
  where e.student_id=learner_uuid and e.archived_at is null
    and public.can_manage_class(c.id)
) $$;

create or replace function public.can_access_unit(unit_uuid uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select
  (select role from public.current_profile()) in ('teacher','administrator')
  or exists(
    select 1 from public.enrolments e
    join public.classes c on c.id=e.class_id
    join public.class_units cu on cu.class_id=c.id
    where e.student_id=auth.uid() and e.archived_at is null
      and c.archived_at is null and c.published
      and cu.unit_id=unit_uuid and cu.active and cu.archived_at is null
  )
$$;

create or replace function public.can_access_course(course_uuid uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select
  (select role from public.current_profile()) in ('teacher','administrator')
  or exists(
    select 1 from public.enrolments e join public.classes c on c.id=e.class_id
    where e.student_id=auth.uid() and e.archived_at is null
      and c.course_id=course_uuid and c.archived_at is null and c.published
  )
$$;

create or replace function public.teacher_configure_class(
  class_uuid uuid,
  name_value text,
  period_uuid uuid,
  course_uuid uuid,
  unit_uuids uuid[],
  active_unit_uuid uuid,
  starts_value date,
  ends_value date,
  weekday_value integer,
  published_value boolean
) returns void
language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; changed integer;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role in ('teacher','administrator') and archived_at is null;
  if actor.id is null or not public.can_manage_class(class_uuid) then
    raise exception 'not_authorised' using errcode='42501';
  end if;
  if length(trim(name_value))<2 or cardinality(unit_uuids)<1
    or weekday_value not between 1 and 7 or ends_value<starts_value then
    raise exception 'invalid_class_configuration' using errcode='22023';
  end if;
  if not exists(select 1 from public.courses c where c.id=course_uuid
      and c.organisation_id=actor.organisation_id and c.archived_at is null and c.active)
    or exists(select 1 from unnest(unit_uuids) selected(id)
      left join public.units u on u.id=selected.id and u.course_id=course_uuid
        and u.archived_at is null
      where u.id is null)
    or active_unit_uuid<>all(unit_uuids)
    or not exists(select 1 from public.academic_periods ap
      join public.academic_years ay on ay.id=ap.academic_year_id
      where ap.id=period_uuid and ay.organisation_id=actor.organisation_id
        and ap.archived_at is null) then
    raise exception 'invalid_curriculum' using errcode='22023';
  end if;
  update public.classes set name=trim(name_value),academic_period_id=period_uuid,
    course_id=course_uuid,active_unit_id=active_unit_uuid,starts_on=starts_value,
    ends_on=ends_value,weekly_learning_day=weekday_value,published=published_value
  where id=class_uuid;
  get diagnostics changed=row_count;
  if changed<>1 then raise exception 'class_not_available' using errcode='42501'; end if;

  update public.class_units set archived_at=now(),active=false
    where class_id=class_uuid and unit_id<>all(unit_uuids);
  insert into public.class_units(class_id,unit_id,active,selected_by,archived_at)
    select class_uuid,id,true,actor.id,null from unnest(unit_uuids) selected(id)
  on conflict(class_id,unit_id) do update set
    active=true,selected_by=actor.id,selected_at=now(),archived_at=null;

  insert into public.class_teachers(class_id,teacher_id,is_lead)
  values(class_uuid,actor.id,true)
  on conflict(class_id,teacher_id) do update set archived_at=null;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'class.configured','class',class_uuid,
    jsonb_build_object('course_id',course_uuid,'unit_ids',unit_uuids,
      'active_unit_id',active_unit_uuid,'published',published_value));
end $$;

create or replace function public.teacher_archive_class(class_uuid uuid)
returns void language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; changed integer;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role in ('teacher','administrator') and archived_at is null;
  if actor.id is null or not public.can_manage_class(class_uuid) then
    raise exception 'not_authorised' using errcode='42501';
  end if;
  update public.classes set archived_at=now(),published=false where id=class_uuid;
  get diagnostics changed=row_count;
  if changed<>1 then raise exception 'class_not_available' using errcode='42501'; end if;
  update public.enrolments set archived_at=coalesce(archived_at,now()) where class_id=class_uuid;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id)
  values(actor.organisation_id,actor.id,'class.archived','class',class_uuid);
end $$;

create or replace function public.teacher_move_student(
  learner_uuid uuid,from_class_uuid uuid,to_class_uuid uuid,reason_value text
) returns void language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role in ('teacher','administrator') and archived_at is null;
  if actor.id is null or not public.can_manage_class(from_class_uuid)
    or not public.can_manage_class(to_class_uuid)
    or length(trim(reason_value))<3 then
    raise exception 'not_authorised' using errcode='42501';
  end if;
  if not exists(select 1 from public.enrolments where student_id=learner_uuid
      and class_id=from_class_uuid and archived_at is null) then
    raise exception 'enrolment_not_available' using errcode='22023';
  end if;
  update public.enrolments set archived_at=now()
    where student_id=learner_uuid and class_id=from_class_uuid and archived_at is null;
  insert into public.enrolments(class_id,student_id,archived_at)
  values(to_class_uuid,learner_uuid,null)
  on conflict(class_id,student_id) do update set archived_at=null,enrolled_at=now();
  insert into public.enrolment_history(student_id,from_class_id,to_class_id,moved_by,reason)
  values(learner_uuid,from_class_uuid,to_class_uuid,actor.id,trim(reason_value));
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'learner.moved','learner',learner_uuid,
    jsonb_build_object('from_class_id',from_class_uuid,'to_class_id',to_class_uuid,
      'reason',trim(reason_value)));
end $$;

create or replace function public.teacher_record_action(
  class_uuid uuid,learner_uuid uuid,action_value text,reason_value text,
  review_value date,outcome_value text,metadata_value jsonb default '{}'
) returns uuid language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; created_uuid uuid;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role in ('teacher','administrator') and archived_at is null;
  if actor.id is null or (class_uuid is null and learner_uuid is null)
    or (class_uuid is not null and not public.can_manage_class(class_uuid))
    or (learner_uuid is not null and not public.can_access_learner(learner_uuid))
    or length(trim(action_value))<3 or length(trim(reason_value))<3 then
    raise exception 'invalid_teacher_action' using errcode='22023';
  end if;
  insert into public.teacher_actions(
    organisation_id,teacher_id,class_id,learner_id,action,reason,review_on,outcome,metadata
  ) values(actor.organisation_id,actor.id,class_uuid,learner_uuid,trim(action_value),
    trim(reason_value),review_value,nullif(trim(outcome_value),''),
    coalesce(metadata_value,'{}')) returning id into created_uuid;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id)
  values(actor.organisation_id,actor.id,'teacher_action.created','teacher_action',created_uuid);
  return created_uuid;
end $$;

create or replace function public.teacher_override_pathway(
  learner_uuid uuid,skill_uuid uuid,topic_uuid uuid,new_value text,
  reason_value text,review_value date
) returns uuid language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; previous_value public.pathway; created_uuid uuid;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role in ('teacher','administrator') and archived_at is null;
  if actor.id is null or not public.can_access_learner(learner_uuid)
    or ((skill_uuid is not null)::integer+(topic_uuid is not null)::integer)<>1
    or review_value<current_date or length(trim(reason_value))<5 then
    raise exception 'invalid_pathway_override' using errcode='22023';
  end if;
  if skill_uuid is not null then
    select current_pathway into previous_value from public.skill_mastery
      where learner_id=learner_uuid and skill_id=skill_uuid;
  else
    select current_pathway into previous_value from public.topic_progress
      where learner_id=learner_uuid and topic_id=topic_uuid;
  end if;
  if previous_value is null then raise exception 'progress_not_available' using errcode='22023'; end if;
  insert into public.pathway_overrides(
    learner_id,skill_id,topic_id,previous_pathway,new_pathway,reason,review_on,teacher_id
  ) values(learner_uuid,skill_uuid,topic_uuid,previous_value,new_value::public.pathway,
    trim(reason_value),review_value,actor.id) returning id into created_uuid;
  if skill_uuid is not null then
    update public.skill_mastery set current_pathway=new_value::public.pathway,updated_at=now()
      where learner_id=learner_uuid and skill_id=skill_uuid;
  else
    update public.topic_progress set current_pathway=new_value::public.pathway,updated_at=now()
      where learner_id=learner_uuid and topic_id=topic_uuid;
  end if;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'pathway.overridden','pathway_override',created_uuid,
    jsonb_build_object('previous',previous_value,'new',new_value,'review_on',review_value));
  return created_uuid;
end $$;

create or replace function public.teacher_create_progress_snapshot(
  learner_uuid uuid,class_uuid uuid,period_uuid uuid,
  reflection_value text,next_value text
) returns uuid language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; created_uuid uuid; evidence jsonb;
begin
  select * into actor from public.user_profiles where id=auth.uid()
    and role in ('teacher','administrator') and archived_at is null;
  if actor.id is null or not public.can_manage_class(class_uuid)
    or not public.can_access_learner(learner_uuid)
    or not exists(select 1 from public.enrolments e
      where e.class_id=class_uuid and e.student_id=learner_uuid) then
    raise exception 'not_authorised' using errcode='42501';
  end if;
  select jsonb_build_object(
    'starting_points',(select coalesce(jsonb_agg(i),'[]') from public.assessment_instances i
      where i.learner_id=learner_uuid and i.kind in ('course_starting_point','unit_starting_point')),
    'progress_points',(select coalesce(jsonb_agg(i),'[]') from public.assessment_instances i
      where i.learner_id=learner_uuid and i.kind='progress_point'),
    'skill_mastery',(select coalesce(jsonb_agg(sm),'[]') from public.skill_mastery sm where sm.learner_id=learner_uuid),
    'topic_progress',(select coalesce(jsonb_agg(tp),'[]') from public.topic_progress tp where tp.learner_id=learner_uuid),
    'targets',(select coalesce(jsonb_agg(t),'[]') from public.targets t where t.learner_id=learner_uuid and t.archived_at is null),
    'teacher_actions',(select coalesce(jsonb_agg(ta),'[]') from public.teacher_actions ta where ta.learner_id=learner_uuid and ta.archived_at is null),
    'routes',(select coalesce(jsonb_agg(lr),'[]') from public.learner_routes lr where lr.learner_id=learner_uuid),
    'attempt_count',(select count(*) from public.attempts a where a.learner_id=learner_uuid and a.completed_at is not null),
    'captured_at',now()
  ) into evidence;
  insert into public.progress_snapshots(
    learner_id,class_id,academic_period_id,snapshot_data,learner_reflection,
    next_priorities,created_by
  ) values(learner_uuid,class_uuid,period_uuid,evidence,nullif(trim(reflection_value),''),
    nullif(trim(next_value),''),actor.id) returning id into created_uuid;
  return created_uuid;
end $$;

alter table public.curriculum_versions enable row level security;
alter table public.academic_periods enable row level security;
alter table public.academic_calendar_events enable row level security;
alter table public.class_teachers enable row level security;
alter table public.class_units enable row level security;
alter table public.assessment_blueprints enable row level security;
alter table public.assessment_instances enable row level security;
alter table public.assessment_skill_results enable row level security;
alter table public.skill_progress_comparisons enable row level security;
alter table public.pathway_thresholds enable row level security;
alter table public.pathway_overrides enable row level security;
alter table public.learner_routes enable row level security;
alter table public.topic_skip_evidence enable row level security;
alter table public.teacher_actions enable row level security;
alter table public.progress_snapshots enable row level security;
alter table public.student_import_batches enable row level security;
alter table public.enrolment_history enable row level security;

drop policy courses_org_read on public.courses;
drop policy units_read on public.units;
drop policy topics_read on public.topics;
drop policy learning_aims_read on public.learning_aims;
drop policy skills_read on public.skills;
drop policy lessons_read on public.lessons;
drop policy activities_read on public.activities;
drop policy teaching_screens_read on public.teaching_screens;
drop policy worked_examples_read on public.worked_examples;

create policy courses_org_read on public.courses for select using (
  organisation_id=(select organisation_id from public.current_profile())
    and public.can_access_course(id)
);
create policy units_read on public.units for select using (
  archived_at is null and public.can_access_unit(id)
);
create policy topics_read on public.topics for select using (
  archived_at is null and public.can_access_unit(unit_id)
    and (status='approved' or (select role from public.current_profile()) in ('teacher','administrator'))
);
create policy learning_aims_read on public.learning_aims for select using (
  archived_at is null and public.can_access_unit(unit_id)
    and (status='approved' or (select role from public.current_profile()) in ('teacher','administrator'))
);
create policy skills_read on public.skills for select using (
  archived_at is null and exists(select 1 from public.topics t
    where t.id=topic_id and public.can_access_unit(t.unit_id))
    and (status='approved' or (select role from public.current_profile()) in ('teacher','administrator'))
);
create policy lessons_read on public.lessons for select using (
  archived_at is null and exists(select 1 from public.topics t
    where t.id=topic_id and public.can_access_unit(t.unit_id))
    and (status='approved' or (select role from public.current_profile()) in ('teacher','administrator'))
    and (release_at is null or release_at<=now()
      or (select role from public.current_profile()) in ('teacher','administrator'))
);
create policy activities_read on public.activities for select using (
  archived_at is null and exists(select 1 from public.lessons l join public.topics t on t.id=l.topic_id
    where l.id=lesson_id and public.can_access_unit(t.unit_id))
    and (status='approved' or (select role from public.current_profile()) in ('teacher','administrator'))
    and (release_at is null or release_at<=now()
      or (select role from public.current_profile()) in ('teacher','administrator'))
);
create policy teaching_screens_read on public.teaching_screens for select using (
  archived_at is null and exists(select 1 from public.lessons l join public.topics t on t.id=l.topic_id
    where l.id=lesson_id and public.can_access_unit(t.unit_id))
    and (status='approved' or (select role from public.current_profile()) in ('teacher','administrator'))
);
create policy worked_examples_read on public.worked_examples for select using (
  archived_at is null and exists(select 1 from public.lessons l join public.topics t on t.id=l.topic_id
    where l.id=lesson_id and public.can_access_unit(t.unit_id))
    and (status='approved' or (select role from public.current_profile()) in ('teacher','administrator'))
);

create policy curriculum_versions_read on public.curriculum_versions for select using (
  exists(select 1 from public.courses c where c.id=course_id and c.organisation_id=(select organisation_id from public.current_profile()))
);
create policy academic_periods_read on public.academic_periods for select using (
  exists(select 1 from public.academic_years y where y.id=academic_year_id and y.organisation_id=(select organisation_id from public.current_profile()))
);
create policy academic_calendar_read on public.academic_calendar_events for select using (
  exists(select 1 from public.academic_years y where y.id=academic_year_id and y.organisation_id=(select organisation_id from public.current_profile()))
);
create policy class_teachers_access on public.class_teachers for select using(public.can_access_class(class_id));
create policy class_units_access on public.class_units for select using(public.can_access_class(class_id));
create policy blueprints_org_read on public.assessment_blueprints for select using (
  exists(select 1 from public.curriculum_versions v join public.courses c on c.id=v.course_id
    where v.id=curriculum_version_id and c.organisation_id=(select organisation_id from public.current_profile()))
);
create policy assessment_instances_access on public.assessment_instances for select using(public.can_access_learner(learner_id));
create policy assessment_results_access on public.assessment_skill_results for select using (
  exists(select 1 from public.assessment_instances i where i.id=assessment_instance_id and public.can_access_learner(i.learner_id))
);
create policy comparisons_access on public.skill_progress_comparisons for select using(public.can_access_learner(learner_id));
create policy thresholds_org_read on public.pathway_thresholds for select using (
  organisation_id=(select organisation_id from public.current_profile())
);
create policy overrides_access on public.pathway_overrides for select using(public.can_access_learner(learner_id));
create policy routes_access on public.learner_routes for select using(public.can_access_learner(learner_id));
create policy skip_evidence_access on public.topic_skip_evidence for select using(public.can_access_learner(learner_id));
create policy teacher_actions_access on public.teacher_actions for select using (
  organisation_id=(select organisation_id from public.current_profile())
  and (learner_id is null or public.can_access_learner(learner_id))
  and (class_id is null or public.can_access_class(class_id))
);
create policy snapshots_access on public.progress_snapshots for select using(public.can_access_learner(learner_id));
create policy import_batches_staff on public.student_import_batches for select using(public.can_manage_class(class_id));
create policy enrolment_history_access on public.enrolment_history for select using(public.can_access_learner(student_id));

revoke all on function public.can_manage_class(uuid) from public;
revoke all on function public.can_access_unit(uuid) from public;
revoke all on function public.can_access_course(uuid) from public;
revoke all on function public.teacher_configure_class(uuid,text,uuid,uuid,uuid[],uuid,date,date,integer,boolean) from public;
revoke all on function public.teacher_archive_class(uuid) from public;
revoke all on function public.teacher_move_student(uuid,uuid,uuid,text) from public;
revoke all on function public.teacher_record_action(uuid,uuid,text,text,date,text,jsonb) from public;
revoke all on function public.teacher_override_pathway(uuid,uuid,uuid,text,text,date) from public;
revoke all on function public.teacher_create_progress_snapshot(uuid,uuid,uuid,text,text) from public;
grant execute on function public.can_manage_class(uuid) to authenticated;
grant execute on function public.can_access_unit(uuid) to authenticated;
grant execute on function public.can_access_course(uuid) to authenticated;
grant execute on function public.teacher_configure_class(uuid,text,uuid,uuid,uuid[],uuid,date,date,integer,boolean) to authenticated;
grant execute on function public.teacher_archive_class(uuid) to authenticated;
grant execute on function public.teacher_move_student(uuid,uuid,uuid,text) to authenticated;
grant execute on function public.teacher_record_action(uuid,uuid,text,text,date,text,jsonb) to authenticated;
grant execute on function public.teacher_override_pathway(uuid,uuid,uuid,text,text,date) to authenticated;
grant execute on function public.teacher_create_progress_snapshot(uuid,uuid,uuid,text,text) to authenticated;

comment on table public.assessment_instances is
  'Append-only course/unit starting points, progress points and retention checks.';
comment on table public.progress_snapshots is
  'Permanent term/semester evidence snapshots; prior snapshots are never overwritten.';
comment on table public.topic_skip_evidence is
  'Positive, reversible evidence for topic-level fast tracking; never authorises whole-unit skipping.';
