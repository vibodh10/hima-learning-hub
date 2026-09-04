\set ON_ERROR_STOP on

do $$
declare
  checked_table text;
begin
  foreach checked_table in array array[
    'attempts','attempt_answers','organisations','deadlines','reminders','audit_logs',
    'interventions',
    'learner_curriculum_progress','learner_curriculum_attempts',
    'workbook_teacher_decisions','class_registration_links'
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
  if not exists(select 1 from pg_policies
    where schemaname='public' and tablename='interventions'
      and policyname='interventions_staff_read') then
    raise exception 'staff-only intervention policy is missing';
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
  if has_table_privilege('authenticated','public.interventions','INSERT')
    or has_table_privilege('authenticated','public.interventions','UPDATE')
    or has_table_privilege('authenticated','public.interventions','DELETE') then
    raise exception 'browser role can rewrite professional intervention history';
  end if;
  if has_table_privilege('authenticated','public.workbook_teacher_decisions','INSERT')
    or has_table_privilege('authenticated','public.workbook_teacher_decisions','UPDATE')
    or has_table_privilege('authenticated','public.workbook_teacher_decisions','DELETE') then
    raise exception 'browser role can bypass the audited workbook decision function';
  end if;
  if has_table_privilege('authenticated','public.class_registration_links','INSERT')
    or has_table_privilege('authenticated','public.class_registration_links','UPDATE')
    or has_table_privilege('authenticated','public.class_registration_links','DELETE')
    or has_table_privilege('anon','public.class_registration_links','SELECT')
    or has_table_privilege('anon','public.class_registration_links','INSERT')
    or has_table_privilege('anon','public.class_registration_links','UPDATE')
    or has_table_privilege('anon','public.class_registration_links','DELETE') then
    raise exception 'registration links expose unsafe browser privileges';
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
  if not (
    select prosecdef and proconfig @> array['search_path=""']
    from pg_proc
    where oid='public.can_read_class_intervention(uuid,uuid)'::regprocedure
  ) then raise exception 'intervention scope helper is not security-definer with an empty search path'; end if;
  if not (
    select prosecdef and proconfig @> array['search_path=""']
    from pg_proc
    where oid='public.teacher_record_workbook_decision(uuid,text,text,text,text,text,text,date)'::regprocedure
  ) then raise exception 'workbook decision function is not security-definer with an empty search path'; end if;
  if not (
    select prosecdef and proconfig @> array['search_path=""']
    from pg_proc
    where oid='public.consume_class_registration_link(text,uuid,text,text)'::regprocedure
  ) then raise exception 'registration-link consumption function is not security-definer with an empty search path'; end if;
  if has_function_privilege('authenticated','public.consume_class_registration_link(text,uuid,text,text)','EXECUTE')
    or has_function_privilege('anon','public.consume_class_registration_link(text,uuid,text,text)','EXECUTE') then
    raise exception 'registration-link consumption function is browser executable';
  end if;
  if not (
    select prosecdef and proconfig @> array['search_path=""']
    from pg_proc
    where oid='public.student_join_class_registration_link(text)'::regprocedure
  ) then raise exception 'existing-student registration function is not security-definer with an empty search path'; end if;
end $$;

select 'security invariants passed' as result;
