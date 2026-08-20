-- Hima Learning Hub: adaptive learning, content authoring and gamification
-- foundation. This migration is additive and preserves all vertical-slice data.

create type public.content_status as enum ('draft','approved','archived');
create type public.learning_stage as enum (
  'learn','worked_example','guided_practice','core_practice',
  'challenge_practice','mastery_check','retrieval_review'
);
create type public.curriculum_kind as enum ('qualification','content_area');
create type public.reward_kind as enum (
  'profile_theme','avatar_item','dashboard_background','badge_frame','celebration_effect'
);
create type public.coin_reason as enum (
  'required_learning','on_time','improvement','retrieval','skill_mastery',
  'error_correction','consistency','optional_challenge','teacher_correction','reward_purchase','refund'
);

alter type public.question_kind add value if not exists 'identify_error';
alter type public.question_kind add value if not exists 'correct_code';
alter type public.question_kind add value if not exists 'sql_completion';
alter type public.question_kind add value if not exists 'html_css_completion';
alter type public.question_kind add value if not exists 'scenario_decision';

alter table public.courses
  add column slug text,
  add column curriculum_kind public.curriculum_kind not null default 'qualification',
  add column published boolean not null default true;
create unique index courses_org_slug_idx on public.courses(organisation_id,slug) where slug is not null;

alter table public.units
  add column status public.content_status not null default 'approved',
  add column description text;

create table public.learning_aims (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id),
  code text not null,
  title text not null,
  description text,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(unit_id,code)
);

alter table public.topics
  add column learning_aim_id uuid references public.learning_aims(id),
  add column status public.content_status not null default 'approved',
  add column description text;

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id),
  code text not null,
  title text not null,
  description text not null,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(topic_id,code)
);

alter table public.lessons
  add column learning_aim_id uuid references public.learning_aims(id),
  add column status public.content_status not null default 'approved',
  add column language text,
  add column objectives jsonb not null default '[]',
  add column estimated_minutes integer not null default 45,
  add column authored_by uuid references public.user_profiles(id),
  add column approved_by uuid references public.user_profiles(id),
  add column approved_at timestamptz,
  add column updated_at timestamptz not null default now();

create table public.teaching_screens (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id),
  sort_order integer not null,
  title text not null,
  body text not null,
  example text,
  code_sample text,
  diagram jsonb,
  definition text,
  common_mistake text,
  remember_text text,
  status public.content_status not null default 'draft',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(lesson_id,sort_order)
);

create table public.worked_examples (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id),
  skill_id uuid not null references public.skills(id),
  sort_order integer not null,
  title text not null,
  problem text not null,
  planned_solution text not null,
  worked_steps jsonb not null,
  code_sample text,
  expected_output text,
  common_error text,
  status public.content_status not null default 'draft',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(lesson_id,sort_order)
);

alter table public.activities
  add column learning_stage public.learning_stage,
  add column status public.content_status not null default 'approved',
  add column home_session_number integer,
  add column instructions text,
  add column skill_selection jsonb not null default '[]',
  add column approved_by uuid references public.user_profiles(id),
  add column approved_at timestamptz,
  add constraint activities_home_session_positive check (home_session_number is null or home_session_number > 0);

create table public.question_templates (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  skill_id uuid not null references public.skills(id),
  title text not null,
  kind public.question_kind not null,
  template_text text not null,
  parameter_schema jsonb not null,
  answer_template jsonb not null,
  deterministic_generator text not null,
  status public.content_status not null default 'draft',
  authored_by uuid not null references public.user_profiles(id),
  approved_by uuid references public.user_profiles(id),
  approved_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.questions
  add column learning_aim_id uuid references public.learning_aims(id),
  add column skill_id uuid references public.skills(id),
  add column pathway public.pathway,
  add column feedback_correct text,
  add column feedback_incorrect text,
  add column hint text,
  add column status public.content_status not null default 'approved',
  add column authored_by uuid references public.user_profiles(id),
  add column approved_by uuid references public.user_profiles(id),
  add column approved_at timestamptz,
  add column template_id uuid references public.question_templates(id),
  add column variation_parameters jsonb not null default '{}',
  add column source_question_id uuid references public.questions(id),
  add column updated_at timestamptz not null default now();

create table public.question_template_variants (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.question_templates(id),
  question_id uuid references public.questions(id),
  parameters jsonb not null,
  generated_text text not null,
  generated_answer jsonb not null,
  status public.content_status not null default 'draft',
  generated_by uuid references public.user_profiles(id),
  approved_by uuid references public.user_profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique(template_id,parameters)
);

create table public.misconceptions (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(id),
  code text not null,
  title text not null,
  description text not null,
  reteach_guidance text,
  archived_at timestamptz,
  unique(skill_id,code)
);

create table public.question_misconceptions (
  question_id uuid not null references public.questions(id),
  misconception_id uuid not null references public.misconceptions(id),
  trigger_answer jsonb,
  primary key(question_id,misconception_id)
);

alter table public.attempts
  add column active_seconds integer,
  add column confidence_rating integer,
  add column mastery_before jsonb not null default '{}',
  add column mastery_after jsonb not null default '{}',
  add column allocation_id uuid,
  add constraint attempts_active_seconds_nonnegative check (active_seconds is null or active_seconds >= 0),
  add constraint attempts_confidence_range check (confidence_rating is null or confidence_rating between 1 and 5);

alter table public.attempt_answers
  add column skill_id uuid references public.skills(id),
  add column difficulty public.pathway,
  add column started_at timestamptz,
  add column completed_at timestamptz,
  add column mastery_before numeric(5,2),
  add column mastery_after numeric(5,2),
  add column misconception_id uuid references public.misconceptions(id),
  add constraint answer_mastery_before_range check (mastery_before is null or mastery_before between 0 and 100),
  add constraint answer_mastery_after_range check (mastery_after is null or mastery_after between 0 and 100);

create table public.skill_mastery (
  learner_id uuid not null references public.user_profiles(id),
  skill_id uuid not null references public.skills(id),
  first_attempt_accuracy numeric(5,2) not null default 0,
  latest_accuracy numeric(5,2) not null default 0,
  best_accuracy numeric(5,2) not null default 0,
  mastery_score numeric(5,2) not null default 0,
  current_pathway public.pathway not null default 'Support',
  attempts_count integer not null default 0,
  hints_used integer not null default 0,
  repeated_error_count integer not null default 0,
  retrieval_score numeric(5,2),
  confidence_average numeric(3,2),
  improvement numeric(6,2) not null default 0,
  last_practised_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(learner_id,skill_id),
  check (mastery_score between 0 and 100)
);

create table public.learner_misconceptions (
  learner_id uuid not null references public.user_profiles(id),
  misconception_id uuid not null references public.misconceptions(id),
  occurrence_count integer not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  intervention_id uuid references public.interventions(id),
  primary key(learner_id,misconception_id)
);

create table public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id),
  week_start date not null,
  title text not null,
  required_home_sessions integer not null default 3,
  retrieval_required boolean not null default true,
  release_at timestamptz,
  deadline_at timestamptz,
  created_by uuid not null references public.user_profiles(id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(class_id,week_start),
  check (required_home_sessions between 0 and 7)
);

create table public.weekly_plan_activities (
  weekly_plan_id uuid not null references public.weekly_plans(id),
  activity_id uuid not null references public.activities(id),
  sequence integer not null,
  session_label text not null,
  required boolean not null default true,
  primary key(weekly_plan_id,activity_id),
  unique(weekly_plan_id,sequence)
);

create table public.activity_allocations (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id),
  class_id uuid references public.classes(id),
  learner_id uuid references public.user_profiles(id),
  allocated_pathway public.pathway,
  release_at timestamptz,
  deadline_at timestamptz,
  required boolean not null default true,
  allocated_by uuid not null references public.user_profiles(id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  check ((class_id is not null)::integer + (learner_id is not null)::integer = 1)
);
alter table public.attempts add constraint attempts_allocation_fk
  foreign key(allocation_id) references public.activity_allocations(id);

create table public.retrieval_schedules (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.user_profiles(id),
  topic_id uuid not null references public.topics(id),
  source_activity_id uuid not null references public.activities(id),
  review_activity_id uuid references public.activities(id),
  scheduled_for date not null,
  status text not null default 'scheduled',
  completed_attempt_id uuid references public.attempts(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(learner_id,source_activity_id,scheduled_for),
  check (status in ('scheduled','available','completed','cancelled'))
);

create table public.badge_definitions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  code text not null,
  title text not null,
  description text not null,
  icon text not null,
  criteria jsonb not null,
  one_time boolean not null default true,
  enabled boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique(organisation_id,code)
);

create table public.badge_awards (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.user_profiles(id),
  badge_id uuid not null references public.badge_definitions(id),
  reason text not null,
  evidence jsonb not null,
  awarded_at timestamptz not null default now(),
  source_attempt_id uuid references public.attempts(id),
  unique(learner_id,badge_id)
);

create table public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.user_profiles(id),
  amount integer not null,
  reason public.coin_reason not null,
  description text not null,
  source_attempt_id uuid references public.attempts(id),
  source_activity_id uuid references public.activities(id),
  corrected_transaction_id uuid references public.coin_transactions(id),
  idempotency_key text not null,
  created_by uuid references public.user_profiles(id),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  unique(learner_id,idempotency_key),
  check (amount <> 0)
);

create table public.reward_items (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  code text not null,
  title text not null,
  description text not null,
  kind public.reward_kind not null,
  price integer not null,
  asset_config jsonb not null,
  enabled boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique(organisation_id,code),
  check (price > 0)
);

create table public.reward_purchases (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.user_profiles(id),
  reward_id uuid not null references public.reward_items(id),
  price_paid integer not null,
  coin_transaction_id uuid not null references public.coin_transactions(id),
  purchased_at timestamptz not null default now(),
  unique(learner_id,reward_id),
  check (price_paid > 0)
);

create table public.gamification_settings (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  class_id uuid references public.classes(id),
  learner_id uuid references public.user_profiles(id),
  badges_enabled boolean not null default true,
  coins_enabled boolean not null default true,
  streaks_enabled boolean not null default true,
  coin_rules jsonb not null default '{}',
  updated_by uuid not null references public.user_profiles(id),
  updated_at timestamptz not null default now(),
  check ((class_id is not null)::integer + (learner_id is not null)::integer <= 1)
);
create unique index gamification_org_default_idx on public.gamification_settings(organisation_id)
  where class_id is null and learner_id is null;
create unique index gamification_class_idx on public.gamification_settings(class_id) where class_id is not null;
create unique index gamification_learner_idx on public.gamification_settings(learner_id) where learner_id is not null;

create table public.practice_days (
  learner_id uuid not null references public.user_profiles(id),
  practice_date date not null,
  scheduled boolean not null default true,
  qualifying_attempt_id uuid references public.attempts(id),
  created_at timestamptz not null default now(),
  primary key(learner_id,practice_date)
);

create table public.practice_streaks (
  learner_id uuid primary key references public.user_profiles(id),
  current_count integer not null default 0,
  best_count integer not null default 0,
  last_practice_date date,
  grace_used_at date,
  updated_at timestamptz not null default now(),
  check (current_count >= 0 and best_count >= 0)
);

create index learning_aims_unit_idx on public.learning_aims(unit_id,sort_order) where archived_at is null;
create index skills_topic_idx on public.skills(topic_id,sort_order) where archived_at is null;
create index questions_skill_idx on public.questions(skill_id,difficulty,status) where archived_at is null;
create index mastery_learner_idx on public.skill_mastery(learner_id,current_pathway,mastery_score);
create index misconceptions_learner_idx on public.learner_misconceptions(learner_id,last_seen_at desc);
create index allocations_class_idx on public.activity_allocations(class_id,release_at) where archived_at is null;
create index allocations_learner_idx on public.activity_allocations(learner_id,release_at) where archived_at is null;
create index retrieval_due_idx on public.retrieval_schedules(learner_id,scheduled_for,status);
create index coin_ledger_idx on public.coin_transactions(learner_id,created_at desc);

-- Draft curriculum must never become student-readable through the older
-- permissive policies.
drop policy lessons_read on public.lessons;
drop policy activities_read on public.activities;
drop policy questions_read on public.questions;
create policy lessons_read on public.lessons for select using (
  auth.uid() is not null and archived_at is null and
  (status='approved' or (select role from public.current_profile()) in ('teacher','administrator')) and
  (release_at is null or release_at<=now() or (select role from public.current_profile()) in ('teacher','administrator'))
);
create policy activities_read on public.activities for select using (
  auth.uid() is not null and archived_at is null and
  (status='approved' or (select role from public.current_profile()) in ('teacher','administrator')) and
  (release_at is null or release_at<=now() or (select role from public.current_profile()) in ('teacher','administrator'))
);
create policy questions_read on public.questions for select using (
  auth.uid() is not null and archived_at is null and
  (status='approved' or (select role from public.current_profile()) in ('teacher','administrator'))
);

alter table public.learning_aims enable row level security;
alter table public.skills enable row level security;
alter table public.teaching_screens enable row level security;
alter table public.worked_examples enable row level security;
alter table public.question_templates enable row level security;
alter table public.question_template_variants enable row level security;
alter table public.misconceptions enable row level security;
alter table public.question_misconceptions enable row level security;
alter table public.skill_mastery enable row level security;
alter table public.learner_misconceptions enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.weekly_plan_activities enable row level security;
alter table public.activity_allocations enable row level security;
alter table public.retrieval_schedules enable row level security;
alter table public.badge_definitions enable row level security;
alter table public.badge_awards enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.reward_items enable row level security;
alter table public.reward_purchases enable row level security;
alter table public.gamification_settings enable row level security;
alter table public.practice_days enable row level security;
alter table public.practice_streaks enable row level security;

create policy learning_aims_read on public.learning_aims for select using (
  status='approved' or (select role from public.current_profile()) in ('teacher','administrator')
);
create policy skills_read on public.skills for select using (
  status='approved' or (select role from public.current_profile()) in ('teacher','administrator')
);
create policy teaching_screens_read on public.teaching_screens for select using (
  archived_at is null and (status='approved' or (select role from public.current_profile()) in ('teacher','administrator'))
);
create policy worked_examples_read on public.worked_examples for select using (
  archived_at is null and (status='approved' or (select role from public.current_profile()) in ('teacher','administrator'))
);
create policy templates_staff_read on public.question_templates for select using (
  (select role from public.current_profile()) in ('teacher','administrator')
);
create policy variants_staff_read on public.question_template_variants for select using (
  (select role from public.current_profile()) in ('teacher','administrator')
);
create policy misconceptions_member_read on public.misconceptions for select using (auth.uid() is not null);
create policy question_misconceptions_staff_read on public.question_misconceptions for select using (
  (select role from public.current_profile()) in ('teacher','administrator')
);
create policy mastery_authorised_read on public.skill_mastery for select using (public.can_access_learner(learner_id));
create policy learner_misconceptions_authorised_read on public.learner_misconceptions for select using (
  public.can_access_learner(learner_id)
);
create policy weekly_plans_member_read on public.weekly_plans for select using (public.can_access_class(class_id));
create policy weekly_plan_activities_member_read on public.weekly_plan_activities for select using (
  exists(select 1 from public.weekly_plans w where w.id=weekly_plan_id and public.can_access_class(w.class_id))
);
create policy allocations_member_read on public.activity_allocations for select using (
  (class_id is not null and public.can_access_class(class_id)) or public.can_access_learner(learner_id)
);
create policy retrieval_authorised_read on public.retrieval_schedules for select using (
  public.can_access_learner(learner_id)
);
create policy badge_definitions_member_read on public.badge_definitions for select using (
  organisation_id=(select organisation_id from public.current_profile()) and enabled and archived_at is null
);
create policy badge_awards_authorised_read on public.badge_awards for select using (
  public.can_access_learner(learner_id)
);
create policy coin_transactions_authorised_read on public.coin_transactions for select using (
  public.can_access_learner(learner_id)
);
create policy reward_items_member_read on public.reward_items for select using (
  organisation_id=(select organisation_id from public.current_profile()) and enabled and archived_at is null
);
create policy reward_purchases_authorised_read on public.reward_purchases for select using (
  public.can_access_learner(learner_id)
);
create policy gamification_settings_member_read on public.gamification_settings for select using (
  organisation_id=(select organisation_id from public.current_profile())
);
create policy practice_days_authorised_read on public.practice_days for select using (
  public.can_access_learner(learner_id)
);
create policy practice_streaks_authorised_read on public.practice_streaks for select using (
  public.can_access_learner(learner_id)
);

-- Staff authoring is constrained to their organisation through the hierarchy.
create policy learning_aims_staff_write on public.learning_aims for all using (
  (select role from public.current_profile()) in ('teacher','administrator') and
  exists(select 1 from public.units u join public.courses c on c.id=u.course_id
    where u.id=unit_id and c.organisation_id=(select organisation_id from public.current_profile()))
) with check (
  (select role from public.current_profile()) in ('teacher','administrator') and
  exists(select 1 from public.units u join public.courses c on c.id=u.course_id
    where u.id=unit_id and c.organisation_id=(select organisation_id from public.current_profile()))
);
create policy skills_staff_write on public.skills for all using (
  (select role from public.current_profile()) in ('teacher','administrator') and
  exists(select 1 from public.topics t join public.units u on u.id=t.unit_id join public.courses c on c.id=u.course_id
    where t.id=topic_id and c.organisation_id=(select organisation_id from public.current_profile()))
) with check (
  (select role from public.current_profile()) in ('teacher','administrator') and
  exists(select 1 from public.topics t join public.units u on u.id=t.unit_id join public.courses c on c.id=u.course_id
    where t.id=topic_id and c.organisation_id=(select organisation_id from public.current_profile()))
);
create policy teaching_screens_staff_write on public.teaching_screens for all using (
  (select role from public.current_profile()) in ('teacher','administrator')
) with check ((select role from public.current_profile()) in ('teacher','administrator'));
create policy worked_examples_staff_write on public.worked_examples for all using (
  (select role from public.current_profile()) in ('teacher','administrator')
) with check ((select role from public.current_profile()) in ('teacher','administrator'));
create policy weekly_plans_staff_write on public.weekly_plans for all using (
  (select role from public.current_profile()) in ('teacher','administrator') and public.can_access_class(class_id)
) with check (
  (select role from public.current_profile()) in ('teacher','administrator') and public.can_access_class(class_id)
);
create policy allocations_staff_write on public.activity_allocations for all using (
  (select role from public.current_profile()) in ('teacher','administrator')
) with check ((select role from public.current_profile()) in ('teacher','administrator'));
create policy gamification_staff_write on public.gamification_settings for all using (
  (select role from public.current_profile()) in ('teacher','administrator') and
  organisation_id=(select organisation_id from public.current_profile())
) with check (
  (select role from public.current_profile()) in ('teacher','administrator') and
  organisation_id=(select organisation_id from public.current_profile())
);

grant select on public.learning_aims,public.skills,public.teaching_screens,
  public.worked_examples,public.misconceptions,public.skill_mastery,
  public.learner_misconceptions,public.weekly_plans,public.weekly_plan_activities,
  public.activity_allocations,public.retrieval_schedules,public.badge_definitions,
  public.badge_awards,public.coin_transactions,public.reward_items,
  public.reward_purchases,public.gamification_settings,public.practice_days,
  public.practice_streaks to authenticated;
grant select(skill_id,learning_aim_id,pathway,hint,status) on public.questions to authenticated;
grant insert,update,delete on public.learning_aims,public.skills,
  public.teaching_screens,public.worked_examples,public.weekly_plans,
  public.weekly_plan_activities,public.activity_allocations,
  public.gamification_settings to authenticated;

-- Academic evidence and coin/badge state remain RPC-only.
revoke insert,update,delete on public.skill_mastery,public.learner_misconceptions,
  public.retrieval_schedules,public.badge_awards,public.coin_transactions,
  public.reward_purchases,public.practice_days,public.practice_streaks from authenticated;

create function public.coin_balance(learner_uuid uuid default auth.uid()) returns integer
language sql stable security definer set search_path=''
as $$
  select case when public.can_access_learner(learner_uuid)
    then coalesce((select sum(amount)::integer from public.coin_transactions where learner_id=learner_uuid),0)
    else null end
$$;

revoke all on function public.coin_balance(uuid) from public;
grant execute on function public.coin_balance(uuid) to authenticated;

create function public.purchase_reward(reward_uuid uuid) returns uuid
language plpgsql security definer set search_path=''
as $$
declare
  actor public.user_profiles;
  reward public.reward_items;
  balance integer;
  transaction_uuid uuid;
  purchase_uuid uuid;
begin
  select * into actor from public.user_profiles
    where id=auth.uid() and role='student' and archived_at is null;
  if actor.id is null then raise exception 'not_authorised' using errcode='42501'; end if;
  select * into reward from public.reward_items
    where id=reward_uuid and organisation_id=actor.organisation_id and enabled and archived_at is null;
  if reward.id is null then raise exception 'reward_unavailable' using errcode='22023'; end if;
  if exists(select 1 from public.reward_purchases where learner_id=actor.id and reward_id=reward.id) then
    raise exception 'already_owned' using errcode='23505';
  end if;
  select coalesce(sum(amount),0)::integer into balance from public.coin_transactions where learner_id=actor.id;
  if balance < reward.price then raise exception 'insufficient_coins' using errcode='22023'; end if;
  insert into public.coin_transactions(
    learner_id,amount,reason,description,idempotency_key,created_by,metadata
  ) values(
    actor.id,-reward.price,'reward_purchase',
    format('Purchased cosmetic reward: %s',reward.title),
    format('reward:%s',reward.id),actor.id,jsonb_build_object('reward_id',reward.id)
  ) returning id into transaction_uuid;
  insert into public.reward_purchases(learner_id,reward_id,price_paid,coin_transaction_id)
  values(actor.id,reward.id,reward.price,transaction_uuid) returning id into purchase_uuid;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'reward.purchased','reward_purchase',purchase_uuid,
    jsonb_build_object('reward_id',reward.id,'price',reward.price));
  return purchase_uuid;
end $$;

revoke all on function public.purchase_reward(uuid) from public;
grant execute on function public.purchase_reward(uuid) to authenticated;

comment on table public.coin_transactions is
  'Append-only, server-controlled gold-coin ledger. Corrections use compensating transactions.';
comment on table public.reward_items is
  'Cosmetic rewards only. Academic evidence, marks, hints and required work must never be represented here.';
comment on table public.question_template_variants is
  'Deterministic variants or drafts requiring teacher approval before student use.';
