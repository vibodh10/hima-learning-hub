\set ON_ERROR_STOP on

do $$
declare
  checked_table text;
begin
  foreach checked_table in array array[
    'attempts','attempt_answers','organisations','deadlines','reminders','audit_logs',
    'learner_curriculum_progress','learner_curriculum_attempts',
    'workbook_teacher_decisions'
  ] loop
    if to_regclass('public.'||checked_table) is null then
      raise exception 'required table public.% is missing',checked_table;
    end if;
    if not (select relrowsecurity from pg_class where oid=to_regclass('public.'||checked_table)) then
      raise exception 'RLS is disabled for public.%',checked_table;
    end if;
  end loop;

  if not exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='attempts'
      and column_name='teacher_override_by'
  ) then raise exception 'attempt teacher attribution is missing'; end if;

  if not exists(
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='user_profiles'
      and constraint_type='PRIMARY KEY'
  ) then raise exception 'user profile primary key is missing'; end if;

  if to_regprocedure('public.can_access_learner(uuid)') is null
    or to_regprocedure('public.can_access_class(uuid)') is null
    or to_regprocedure('public.student_has_assigned_unit_code(text)') is null
    or to_regprocedure('public.submit_activity(uuid,jsonb,integer)') is null then
    raise exception 'required access/submission function is missing';
  end if;

  if not exists(select 1 from pg_policies
    where schemaname='public' and tablename='attempts'
      and policyname='attempts_select_authorised') then
    raise exception 'attempt authorisation policy is missing';
  end if;
  if not exists(select 1 from pg_policies
    where schemaname='public' and tablename='user_profiles'
      and policyname='profiles_select_authorised') then
    raise exception 'profile authorisation policy is missing';
  end if;

  if has_table_privilege('authenticated','public.attempts','INSERT') then
    raise exception 'browser role can insert attempt headers directly';
  end if;
  if has_table_privilege('authenticated','public.attempt_answers','UPDATE') then
    raise exception 'browser role can rewrite historical answers';
  end if;
  if has_table_privilege('authenticated','public.learner_curriculum_progress','INSERT')
    or has_table_privilege('authenticated','public.learner_curriculum_progress','UPDATE') then
    raise exception 'browser role can forge curriculum progress';
  end if;
  if has_table_privilege('authenticated','public.learner_curriculum_attempts','INSERT')
    or has_table_privilege('authenticated','public.learner_curriculum_attempts','UPDATE') then
    raise exception 'browser role can forge curriculum marks or teacher reviews';
  end if;
  if has_column_privilege('authenticated','public.questions','correct_answer','SELECT') then
    raise exception 'correct answers are directly readable by browser users';
  end if;
  if not (
    select prosecdef and proconfig @> array['search_path=""']
    from pg_proc where oid='public.submit_activity(uuid,jsonb,integer)'::regprocedure
  ) then raise exception 'submission RPC is not security-definer with an empty search path'; end if;
  if not (
    select prosecdef and proconfig @> array['search_path=""']
    from pg_proc
    where oid='public.can_manage_workbook_learner_unit(uuid,text)'::regprocedure
  ) then raise exception 'workbook scope helper is not security-definer with an empty search path'; end if;
  if not (
    select prosecdef and proconfig @> array['search_path=""']
    from pg_proc
    where oid='public.can_manage_class(uuid)'::regprocedure
  ) then raise exception 'class management helper is not security-definer with an empty search path'; end if;
end $$;

select 'security invariants passed' as result;
