-- Professional Computing Achievement Points are cumulative evidence of
-- engagement and progress. They are deliberately separate from spendable
-- cosmetic coins, so purchasing a theme can never reduce an achievement level.

create table public.achievement_point_rules (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  code text not null,
  title text not null,
  points integer not null,
  enabled boolean not null default true,
  conditions jsonb not null default '{}',
  updated_by uuid references public.user_profiles(id),
  updated_at timestamptz not null default now(),
  unique(organisation_id,code),
  check(length(trim(code)) between 3 and 80),
  check(length(trim(title)) between 3 and 160),
  check(points between 0 and 100),
  check(jsonb_typeof(conditions)='object')
);

create table public.achievement_levels (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  code text not null,
  title text not null,
  threshold integer not null,
  message text not null,
  certificate_eligible boolean not null default false,
  enabled boolean not null default true,
  updated_by uuid references public.user_profiles(id),
  updated_at timestamptz not null default now(),
  unique(organisation_id,code),
  unique(organisation_id,threshold),
  check(threshold>=0),
  check(length(trim(title)) between 3 and 80),
  check(length(trim(message)) between 10 and 500)
);

create table public.learner_achievement_point_events (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.user_profiles(id),
  rule_id uuid not null references public.achievement_point_rules(id),
  points integer not null,
  source_type text not null,
  source_id uuid,
  idempotency_key text not null,
  description text not null,
  evidence jsonb not null default '{}',
  awarded_at timestamptz not null default now(),
  unique(learner_id,idempotency_key),
  check(points>0),
  check(source_type in ('attempt','worksheet','attendance','progress','recognition')),
  check(jsonb_typeof(evidence)='object')
);

create table public.certificate_eligibility_reviews (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.user_profiles(id),
  level_id uuid not null references public.achievement_levels(id),
  status text not null default 'pending_review',
  eligible_at timestamptz not null default now(),
  reviewed_by uuid references public.user_profiles(id),
  reviewed_at timestamptz,
  review_note text,
  unique(learner_id,level_id),
  check(status in ('pending_review','confirmed','declined'))
);

create table public.recognition_templates (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  code text not null,
  category text not null,
  title text not null,
  message text not null,
  enabled boolean not null default true,
  updated_by uuid references public.user_profiles(id),
  updated_at timestamptz not null default now(),
  unique(organisation_id,code),
  check(category in ('improvement','effort','resilience','attendance','challenge','feedback','engagement','peer_support')),
  check(length(trim(title)) between 3 and 100),
  check(length(trim(message)) between 10 and 500)
);

create table public.learner_recognitions (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.user_profiles(id),
  class_id uuid not null references public.classes(id),
  template_id uuid not null references public.recognition_templates(id),
  recognised_by uuid not null references public.user_profiles(id),
  title text not null,
  message text not null,
  evidence jsonb not null default '{}',
  recognised_at timestamptz not null default now(),
  seen_at timestamptz,
  check(jsonb_typeof(evidence)='object')
);

create index learner_achievement_events_timeline_idx
  on public.learner_achievement_point_events(learner_id,awarded_at desc);
create index learner_recognitions_timeline_idx
  on public.learner_recognitions(learner_id,recognised_at desc);

alter table public.achievement_point_rules enable row level security;
alter table public.achievement_levels enable row level security;
alter table public.learner_achievement_point_events enable row level security;
alter table public.certificate_eligibility_reviews enable row level security;
alter table public.recognition_templates enable row level security;
alter table public.learner_recognitions enable row level security;

grant select on public.achievement_point_rules,public.achievement_levels,
  public.learner_achievement_point_events,public.certificate_eligibility_reviews,
  public.recognition_templates,public.learner_recognitions to authenticated;

create policy achievement_rules_read on public.achievement_point_rules for select to authenticated
using(organisation_id=(select organisation_id from public.current_profile()));
create policy achievement_levels_read on public.achievement_levels for select to authenticated
using(organisation_id=(select organisation_id from public.current_profile()));
create policy recognition_templates_read on public.recognition_templates for select to authenticated
using(enabled and organisation_id=(select organisation_id from public.current_profile()));
create policy achievement_events_read on public.learner_achievement_point_events for select to authenticated
using(public.can_access_learner(learner_id));
create policy certificate_eligibility_read on public.certificate_eligibility_reviews for select to authenticated
using(public.can_access_learner(learner_id));
create policy learner_recognitions_read on public.learner_recognitions for select to authenticated
using(public.can_access_learner(learner_id));

create or replace function public.block_achievement_event_mutation()
returns trigger language plpgsql set search_path='' as $$
begin
  raise exception 'achievement_evidence_is_append_only' using errcode='55000';
end $$;
create trigger learner_achievement_events_immutable before update or delete
  on public.learner_achievement_point_events for each row execute function public.block_achievement_event_mutation();

create or replace function public.seed_achievement_configuration()
returns void language plpgsql set search_path=''
as $$
begin
  insert into public.achievement_point_rules(organisation_id,code,title,points,conditions)
  select organisation.id,rule.code,rule.title,rule.points,rule.conditions
  from public.organisations organisation cross join (values
    ('learning_completed','Weekly learning activity completed',5,'{}'::jsonb),
    ('knowledge_check_completed','Knowledge check completed',5,'{}'::jsonb),
    ('practical_task_completed','Practical task completed',10,'{}'::jsonb),
    ('deadline_achievement','Work completed by deadline',10,'{}'::jsonb),
    ('feedback_improvement','Acts on feedback and improves work',10,'{}'::jsonb),
    ('assessment_completed','Assessment completed',15,'{}'::jsonb),
    ('significant_progress','Significant progress from baseline',20,'{"minimum_percentage_points":10}'::jsonb),
    ('excellent_attendance','Excellent attendance',20,'{"minimum_percentage":95,"minimum_sessions":10,"provider_required":true}'::jsonb)
  ) rule(code,title,points,conditions)
  on conflict(organisation_id,code) do nothing;

  insert into public.achievement_levels(
    organisation_id,code,title,threshold,message,certificate_eligible
  )
  select organisation.id,level.code,level.title,level.threshold,level.message,level.certificate_eligible
  from public.organisations organisation cross join (values
    ('bronze','Bronze',25,'You have established a consistent foundation in your Computing learning.',false),
    ('silver','Silver',50,'You have demonstrated sustained engagement and developing independence.',false),
    ('gold','Gold',100,'You have demonstrated consistent commitment, progress and engagement with your Computing learning.',true),
    ('diamond','Diamond',200,'You have demonstrated exceptional sustained progress, independence and engagement.',true)
  ) level(code,title,threshold,message,certificate_eligible)
  on conflict(organisation_id,code) do nothing;

  insert into public.recognition_templates(organisation_id,code,category,title,message)
  select organisation.id,template.code,template.category,template.title,template.message
  from public.organisations organisation cross join (values
    ('noticed-improvement','improvement','Progress noticed','Your recent work shows clear improvement from your earlier evidence.'),
    ('noticed-effort','effort','Effort noticed','Your sustained effort and purposeful engagement have been noticed.'),
    ('noticed-resilience','resilience','Resilience noticed','You responded constructively to difficulty and continued improving your work.'),
    ('noticed-challenge','challenge','Challenge completed','You completed demanding work with appropriate independence and care.'),
    ('noticed-feedback','feedback','Feedback acted upon','You used feedback to make a meaningful, evidenced improvement.'),
    ('noticed-engagement','engagement','Positive engagement','Your positive engagement is supporting your progress in Computing.'),
    ('noticed-peer-support','peer_support','Professional peer support','You supported a peer appropriately while preserving their independent learning.'),
    ('noticed-attendance','attendance','Attendance commitment','Your verified attendance record demonstrates strong commitment to learning.')
  ) template(code,category,title,message)
  on conflict(organisation_id,code) do nothing;
end $$;

select public.seed_achievement_configuration();
revoke all on function public.seed_achievement_configuration() from public,anon,authenticated;

create or replace function public.award_achievement_event(
  learner_uuid uuid,organisation_uuid uuid,event_code text,source_kind text,
  source_uuid uuid,idempotency_value text,description_value text,evidence_value jsonb
) returns integer
language plpgsql security definer set search_path=''
as $$
declare selected_rule public.achievement_point_rules; inserted_points integer;
begin
  select * into selected_rule from public.achievement_point_rules
  where organisation_id=organisation_uuid and code=event_code and enabled;
  if selected_rule.id is null or selected_rule.points<=0 then return 0; end if;
  insert into public.learner_achievement_point_events(
    learner_id,rule_id,points,source_type,source_id,idempotency_key,description,evidence
  ) values(
    learner_uuid,selected_rule.id,selected_rule.points,source_kind,source_uuid,
    idempotency_value,description_value,coalesce(evidence_value,'{}'::jsonb)
  ) on conflict(learner_id,idempotency_key) do nothing returning points into inserted_points;
  return coalesce(inserted_points,0);
end $$;
revoke all on function public.award_achievement_event(uuid,uuid,text,text,uuid,text,text,jsonb) from public,anon,authenticated;

create or replace function public.sync_certificate_eligibility(
  learner_uuid uuid,organisation_uuid uuid
) returns void language plpgsql security definer set search_path=''
as $$
declare total_points integer;
begin
  select coalesce(sum(event.points),0)::integer into total_points
  from public.learner_achievement_point_events event where event.learner_id=learner_uuid;
  insert into public.certificate_eligibility_reviews(learner_id,level_id,status)
  select learner_uuid,level.id,'pending_review' from public.achievement_levels level
  where level.organisation_id=organisation_uuid and level.enabled
    and level.certificate_eligible and level.threshold<=total_points
  on conflict(learner_id,level_id) do nothing;
end $$;
revoke all on function public.sync_certificate_eligibility(uuid,uuid) from public,anon,authenticated;

create or replace function public.apply_worksheet_achievement_points(worksheet_uuid uuid)
returns integer language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; worksheet public.learner_topic_worksheets; points_awarded integer:=0;
begin
  actor:=public.current_profile();
  select * into worksheet from public.learner_topic_worksheets
  where id=worksheet_uuid and learner_id=actor.id;
  if actor.id is null or actor.role<>'student' or worksheet.id is null then
    raise exception 'worksheet_not_available' using errcode='42501';
  end if;
  points_awarded:=points_awarded+public.award_achievement_event(
    actor.id,actor.organisation_id,'learning_completed','worksheet',worksheet.id,
    'worksheet-learning:'||worksheet.id,'Completed an in-portal learning worksheet.',
    jsonb_build_object('unit_code',worksheet.unit_code,'topic_code',worksheet.topic_code,'stage',worksheet.evidence_stage)
  );
  if length(trim(coalesce(worksheet.responses->>'knowledgeCheck','')))>0 then
    points_awarded:=points_awarded+public.award_achievement_event(
      actor.id,actor.organisation_id,'knowledge_check_completed','worksheet',worksheet.id,
      'worksheet-knowledge:'||worksheet.id,'Completed the worksheet knowledge check.',
      jsonb_build_object('unit_code',worksheet.unit_code,'topic_code',worksheet.topic_code)
    );
  end if;
  if length(trim(coalesce(worksheet.responses->>'practicalApplication','')))>0 then
    points_awarded:=points_awarded+public.award_achievement_event(
      actor.id,actor.organisation_id,'practical_task_completed','worksheet',worksheet.id,
      'worksheet-practical:'||worksheet.id,'Completed the worksheet practical application.',
      jsonb_build_object('unit_code',worksheet.unit_code,'topic_code',worksheet.topic_code)
    );
  end if;
  if worksheet.previous_version_id is not null
    and length(trim(coalesce(worksheet.responses->>'improvement','')))>0 then
    points_awarded:=points_awarded+public.award_achievement_event(
      actor.id,actor.organisation_id,'feedback_improvement','worksheet',worksheet.id,
      'worksheet-improvement:'||worksheet.id,'Recorded an evidenced improvement to earlier work.',
      jsonb_build_object('unit_code',worksheet.unit_code,'topic_code',worksheet.topic_code,
        'previous_version_id',worksheet.previous_version_id)
    );
  end if;
  perform public.sync_certificate_eligibility(actor.id,actor.organisation_id);
  return points_awarded;
end $$;

create or replace function public.apply_achievement_point_rules(attempt_uuid uuid)
returns integer language plpgsql security definer set search_path=''
as $$
declare
  actor public.user_profiles;
  attempt_row public.attempts;
  activity_row public.activities;
  effective_deadline timestamptz;
  points_awarded integer:=0;
  comparison record;
begin
  actor:=public.current_profile();
  select * into attempt_row from public.attempts
  where id=attempt_uuid and learner_id=actor.id and completed_at is not null;
  select * into activity_row from public.activities where id=attempt_row.activity_id;
  if actor.id is null or actor.role<>'student' or attempt_row.id is null or activity_row.id is null then
    raise exception 'attempt_not_available' using errcode='42501';
  end if;

  points_awarded:=points_awarded+public.award_achievement_event(
    actor.id,actor.organisation_id,'learning_completed','attempt',attempt_uuid,
    'learning:'||attempt_uuid,'Completed configured learning activity.',
    jsonb_build_object('activity_id',activity_row.id,'percentage',attempt_row.percentage)
  );
  if activity_row.learning_stage in ('mastery_check','retrieval_review')
    or activity_row.kind='review_check' then
    points_awarded:=points_awarded+public.award_achievement_event(
      actor.id,actor.organisation_id,'knowledge_check_completed','attempt',attempt_uuid,
      'knowledge-check:'||attempt_uuid,'Completed a knowledge or retrieval check.',
      jsonb_build_object('activity_id',activity_row.id,'percentage',attempt_row.percentage)
    );
  end if;
  if activity_row.kind='skills_practice' then
    points_awarded:=points_awarded+public.award_achievement_event(
      actor.id,actor.organisation_id,'practical_task_completed','attempt',attempt_uuid,
      'practical:'||attempt_uuid,'Completed a practical Computing task.',
      jsonb_build_object('activity_id',activity_row.id,'percentage',attempt_row.percentage)
    );
  end if;
  select coalesce(
    (select allocation.deadline_at from public.activity_allocations allocation
      where allocation.activity_id=activity_row.id and allocation.archived_at is null
        and (allocation.learner_id=actor.id or exists(select 1 from public.enrolments enrolment
          where enrolment.student_id=actor.id and enrolment.class_id=allocation.class_id
            and enrolment.archived_at is null))
      order by (allocation.learner_id=actor.id) desc,allocation.created_at desc limit 1),
    activity_row.deadline_at
  ) into effective_deadline;
  if effective_deadline is not null and attempt_row.completed_at<=effective_deadline then
    points_awarded:=points_awarded+public.award_achievement_event(
      actor.id,actor.organisation_id,'deadline_achievement','attempt',attempt_uuid,
      'deadline:'||attempt_uuid,'Completed allocated work by its recorded deadline.',
      jsonb_build_object('activity_id',activity_row.id,'deadline',effective_deadline)
    );
  end if;
  if activity_row.assessment_kind is not null then
    points_awarded:=points_awarded+public.award_achievement_event(
      actor.id,actor.organisation_id,'assessment_completed','attempt',attempt_uuid,
      'assessment:'||attempt_uuid,'Completed a configured assessment checkpoint.',
      jsonb_build_object('activity_id',activity_row.id,'assessment_kind',activity_row.assessment_kind)
    );
  end if;
  if exists(select 1 from public.attempts previous
    where previous.learner_id=actor.id and previous.activity_id=activity_row.id
      and previous.completed_at is not null and previous.id<>attempt_uuid
      and previous.percentage<attempt_row.percentage) then
    points_awarded:=points_awarded+public.award_achievement_event(
      actor.id,actor.organisation_id,'feedback_improvement','attempt',attempt_uuid,
      'improvement:'||attempt_uuid,'Improved on an earlier attempt.',
      jsonb_build_object('activity_id',activity_row.id,'percentage',attempt_row.percentage)
    );
  end if;
  for comparison in select skill_id,latest_progress_result_id,improvement_points
    from public.skill_progress_comparisons
    where learner_id=actor.id and improvement_points>=10 and latest_progress_result_id is not null
  loop
    points_awarded:=points_awarded+public.award_achievement_event(
      actor.id,actor.organisation_id,'significant_progress','progress',comparison.latest_progress_result_id,
      'significant-progress:'||comparison.skill_id||':'||comparison.latest_progress_result_id,
      'Demonstrated significant progress from comparable baseline evidence.',
      jsonb_build_object('skill_id',comparison.skill_id,'improvement_points',comparison.improvement_points)
    );
  end loop;

  perform public.sync_certificate_eligibility(actor.id,actor.organisation_id);
  return points_awarded;
end $$;

create or replace function public.learner_achievement_summary(learner_uuid uuid)
returns table(
  ap_total integer,current_level_code text,current_level_title text,
  current_level_message text,next_level_title text,next_threshold integer,
  points_to_next integer,certificate_status text
) language plpgsql stable security definer set search_path=''
as $$
declare actor public.user_profiles; learner_org uuid; total integer;
begin
  actor:=public.current_profile();
  if actor.id is null or not public.can_access_learner(learner_uuid) then
    raise exception 'learner_not_available' using errcode='42501';
  end if;
  select organisation_id into learner_org from public.user_profiles
    where id=learner_uuid and role='student' and archived_at is null;
  if learner_org is null then raise exception 'learner_not_available' using errcode='42501'; end if;
  select coalesce(sum(event.points),0)::integer into total
    from public.learner_achievement_point_events event where event.learner_id=learner_uuid;
  return query
  select total,current_level.code,current_level.title,current_level.message,
    next_level.title,next_level.threshold,
    case when next_level.threshold is null then 0 else greatest(next_level.threshold-total,0) end,
    (select review.status from public.certificate_eligibility_reviews review
      join public.achievement_levels eligible_level on eligible_level.id=review.level_id
      where review.learner_id=learner_uuid order by eligible_level.threshold desc limit 1)
  from lateral(
    select level.code,level.title,level.message from public.achievement_levels level
    where level.organisation_id=learner_org and level.enabled and level.threshold<=total
    order by level.threshold desc limit 1
  ) current_level
  full join lateral(
    select level.title,level.threshold from public.achievement_levels level
    where level.organisation_id=learner_org and level.enabled and level.threshold>total
    order by level.threshold limit 1
  ) next_level on true;
  if not found then
    return query select total,null::text,null::text,null::text,null::text,null::integer,0,null::text;
  end if;
end $$;

create or replace function public.class_learner_achievement(class_uuid uuid)
returns table(
  learner_id uuid,ap_total integer,achievement_level text,
  next_level text,points_to_next integer,certificate_status text
) language plpgsql stable security definer set search_path=''
as $$
declare actor public.user_profiles;
begin
  actor:=public.current_profile();
  if actor.id is null or actor.role not in ('teacher','administrator')
    or not public.can_manage_class(class_uuid) then
    raise exception 'class_not_available' using errcode='42501';
  end if;
  return query
  with totals as(
    select enrolment.student_id,coalesce(sum(event.points),0)::integer total
    from public.enrolments enrolment
    left join public.learner_achievement_point_events event on event.learner_id=enrolment.student_id
    where enrolment.class_id=class_uuid and enrolment.archived_at is null
    group by enrolment.student_id
  )
  select totals.student_id,totals.total,current_level.title,next_level.title,
    case when next_level.threshold is null then 0 else greatest(next_level.threshold-totals.total,0) end,
    certificate.status
  from totals
  left join lateral(
    select level.title from public.achievement_levels level
    where level.organisation_id=actor.organisation_id and level.enabled and level.threshold<=totals.total
    order by level.threshold desc limit 1
  ) current_level on true
  left join lateral(
    select level.title,level.threshold from public.achievement_levels level
    where level.organisation_id=actor.organisation_id and level.enabled and level.threshold>totals.total
    order by level.threshold limit 1
  ) next_level on true
  left join lateral(
    select review.status from public.certificate_eligibility_reviews review
    join public.achievement_levels level on level.id=review.level_id
    where review.learner_id=totals.student_id order by level.threshold desc limit 1
  ) certificate on true;
end $$;

create or replace function public.apply_verified_attendance_achievement(
  learner_uuid uuid,period_start date,period_end date
) returns integer language plpgsql security definer set search_path=''
as $$
declare
  actor public.user_profiles; learner_org uuid; jwt_role text;
  session_count integer; attended_count integer; attendance_percentage numeric;
  minimum_percentage numeric; minimum_sessions integer; awarded integer;
begin
  actor:=public.current_profile();
  jwt_role:=current_setting('request.jwt.claim.role',true);
  select organisation_id into learner_org from public.user_profiles
    where id=learner_uuid and role='student' and archived_at is null;
  if learner_org is null or period_end<period_start
    or not(jwt_role='service_role' or (actor.id is not null and actor.role='administrator'
      and actor.organisation_id=learner_org)) then
    raise exception 'attendance_integration_not_available' using errcode='42501';
  end if;
  if not exists(select 1 from public.attendance_provider_connections connection
    where connection.organisation_id=learner_org and connection.connection_status='connected') then
    raise exception 'attendance_provider_not_connected' using errcode='55000';
  end if;
  select count(*) filter(where event.attendance_status<>'unavailable')::integer,
    count(*) filter(where event.attendance_status in ('present','late'))::integer
  into session_count,attended_count from public.attendance_events event
  where event.learner_id=learner_uuid and event.organisation_id=learner_org
    and event.session_on between period_start and period_end;
  select coalesce((rule.conditions->>'minimum_percentage')::numeric,95),
    coalesce((rule.conditions->>'minimum_sessions')::integer,10)
  into minimum_percentage,minimum_sessions from public.achievement_point_rules rule
  where rule.organisation_id=learner_org and rule.code='excellent_attendance' and rule.enabled;
  if minimum_percentage is null or session_count<minimum_sessions then return 0; end if;
  attendance_percentage:=round(attended_count::numeric*100/nullif(session_count,0),2);
  if attendance_percentage<minimum_percentage then return 0; end if;
  awarded:=public.award_achievement_event(
    learner_uuid,learner_org,'excellent_attendance','attendance',null,
    'attendance:'||period_start||':'||period_end,
    'Verified attendance met the configured achievement threshold.',
    jsonb_build_object('period_start',period_start,'period_end',period_end,
      'sessions',session_count,'attended',attended_count,'percentage',attendance_percentage,
      'provider_names',(select jsonb_agg(distinct event.provider_name) from public.attendance_events event
        where event.learner_id=learner_uuid and event.organisation_id=learner_org
          and event.session_on between period_start and period_end))
  );
  perform public.sync_certificate_eligibility(learner_uuid,learner_org);
  return awarded;
end $$;

create or replace function public.teacher_recognise_learner(
  learner_uuid uuid,class_uuid uuid,template_uuid uuid
) returns uuid language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; selected_template public.recognition_templates; created_uuid uuid;
begin
  actor:=public.current_profile();
  select * into selected_template from public.recognition_templates
    where id=template_uuid and organisation_id=actor.organisation_id and enabled;
  if actor.id is null or actor.role not in ('teacher','administrator')
    or not public.can_manage_class(class_uuid) or selected_template.id is null
    or not exists(select 1 from public.enrolments enrolment where enrolment.class_id=class_uuid
      and enrolment.student_id=learner_uuid and enrolment.archived_at is null) then
    raise exception 'recognition_not_available' using errcode='42501';
  end if;
  insert into public.learner_recognitions(
    learner_id,class_id,template_id,recognised_by,title,message,evidence
  ) values(
    learner_uuid,class_uuid,selected_template.id,actor.id,
    selected_template.title,selected_template.message,
    jsonb_build_object('template_code',selected_template.code,'category',selected_template.category)
  ) returning id into created_uuid;
  return created_uuid;
end $$;

create or replace function public.admin_update_achievement_rule(
  rule_uuid uuid,points_value integer,enabled_value boolean
) returns void language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; changed integer;
begin
  actor:=public.current_profile();
  if actor.id is null or actor.role<>'administrator' or points_value not between 0 and 100 then
    raise exception 'achievement_rule_not_available' using errcode='42501';
  end if;
  update public.achievement_point_rules set points=points_value,enabled=enabled_value,
    updated_by=actor.id,updated_at=now()
  where id=rule_uuid and organisation_id=actor.organisation_id;
  get diagnostics changed=row_count;
  if changed<>1 then raise exception 'achievement_rule_not_available' using errcode='42501'; end if;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'achievement_rule.updated','achievement_point_rule',rule_uuid,
    jsonb_build_object('points',points_value,'enabled',enabled_value));
end $$;

create or replace function public.admin_update_achievement_level(
  level_uuid uuid,threshold_value integer,certificate_eligible_value boolean,enabled_value boolean
) returns void language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; changed integer;
begin
  actor:=public.current_profile();
  if actor.id is null or actor.role<>'administrator' or threshold_value not between 0 and 100000 then
    raise exception 'achievement_level_not_available' using errcode='42501';
  end if;
  update public.achievement_levels set threshold=threshold_value,
    certificate_eligible=certificate_eligible_value,enabled=enabled_value,
    updated_by=actor.id,updated_at=now()
  where id=level_uuid and organisation_id=actor.organisation_id;
  get diagnostics changed=row_count;
  if changed<>1 then raise exception 'achievement_level_not_available' using errcode='42501'; end if;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'achievement_level.updated','achievement_level',level_uuid,
    jsonb_build_object('threshold',threshold_value,'certificate_eligible',certificate_eligible_value,'enabled',enabled_value));
end $$;

create or replace function public.admin_update_recognition_template(
  template_uuid uuid,message_value text,enabled_value boolean
) returns void language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; changed integer;
begin
  actor:=public.current_profile();
  if actor.id is null or actor.role<>'administrator' or length(trim(message_value)) not between 10 and 500 then
    raise exception 'recognition_template_not_available' using errcode='42501';
  end if;
  update public.recognition_templates set message=trim(message_value),enabled=enabled_value,
    updated_by=actor.id,updated_at=now()
  where id=template_uuid and organisation_id=actor.organisation_id;
  get diagnostics changed=row_count;
  if changed<>1 then raise exception 'recognition_template_not_available' using errcode='42501'; end if;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'recognition_template.updated','recognition_template',template_uuid,
    jsonb_build_object('message',trim(message_value),'enabled',enabled_value));
end $$;

revoke all on function public.apply_achievement_point_rules(uuid) from public,anon;
revoke all on function public.apply_worksheet_achievement_points(uuid) from public,anon;
revoke all on function public.learner_achievement_summary(uuid) from public,anon;
revoke all on function public.class_learner_achievement(uuid) from public,anon;
revoke all on function public.apply_verified_attendance_achievement(uuid,date,date) from public,anon;
revoke all on function public.teacher_recognise_learner(uuid,uuid,uuid) from public,anon;
revoke all on function public.admin_update_achievement_rule(uuid,integer,boolean) from public,anon;
revoke all on function public.admin_update_achievement_level(uuid,integer,boolean,boolean) from public,anon;
revoke all on function public.admin_update_recognition_template(uuid,text,boolean) from public,anon;
grant execute on function public.apply_achievement_point_rules(uuid) to authenticated;
grant execute on function public.apply_worksheet_achievement_points(uuid) to authenticated;
grant execute on function public.learner_achievement_summary(uuid) to authenticated;
grant execute on function public.class_learner_achievement(uuid) to authenticated;
grant execute on function public.apply_verified_attendance_achievement(uuid,date,date) to authenticated;
grant execute on function public.teacher_recognise_learner(uuid,uuid,uuid) to authenticated;
grant execute on function public.admin_update_achievement_rule(uuid,integer,boolean) to authenticated;
grant execute on function public.admin_update_achievement_level(uuid,integer,boolean,boolean) to authenticated;
grant execute on function public.admin_update_recognition_template(uuid,text,boolean) to authenticated;

comment on table public.certificate_eligibility_reviews is
  'Gold and Diamond thresholds create eligibility for authorised staff review; they do not promise or issue a college certificate.';
