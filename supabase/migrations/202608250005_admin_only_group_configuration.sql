-- Group lifecycle and routine-learning settings are administrator
-- configuration. Teachers retain the deliberate classroom workflow:
-- invite/enrol, start an approved journey, monitor, intervene and report.

do $$
declare
  function_signature regprocedure;
  current_definition text;
  restricted_definition text;
begin
  foreach function_signature in array array[
    'public.create_class(text,uuid,uuid,text)'::regprocedure,
    'public.teacher_configure_class(uuid,text,uuid,uuid,uuid[],uuid,date,date,integer,boolean)'::regprocedure,
    'public.teacher_duplicate_class(uuid,text,text)'::regprocedure,
    'public.teacher_add_class_teacher(uuid,uuid,boolean)'::regprocedure,
    'public.teacher_allocate_adaptive_homework(uuid,uuid,uuid,text,timestamptz,timestamptz,integer,boolean)'::regprocedure,
    'public.teacher_save_weekly_plan(uuid,date,text,integer,boolean,timestamptz,timestamptz)'::regprocedure,
    'public.teacher_set_pathway_thresholds(uuid,numeric,numeric,numeric,numeric,numeric,numeric,numeric)'::regprocedure,
    'public.teacher_archive_class(uuid)'::regprocedure,
    'public.teacher_move_student(uuid,uuid,uuid,text)'::regprocedure,
    'public.teacher_archive_enrolment(uuid,uuid,text)'::regprocedure,
    'public.teacher_adjust_coins(uuid,integer,text)'::regprocedure,
    'public.teacher_set_coin_rules(uuid,jsonb)'::regprocedure,
    'public.teacher_create_progress_snapshot(uuid,uuid,uuid,text,text)'::regprocedure
  ] loop
    select pg_get_functiondef(function_signature) into current_definition;
    restricted_definition:=replace(
      current_definition,
      'role in (''teacher'',''administrator'')',
      'role=''administrator'''
    );
    if restricted_definition=current_definition then
      raise exception 'administrator guard was not found in %',function_signature;
    end if;
    execute restricted_definition;
  end loop;
end $$;

comment on function public.create_class(text,uuid,uuid,text) is
  'Administrator group configuration. Teachers work with assigned groups.';
comment on function public.teacher_allocate_adaptive_homework(uuid,uuid,uuid,text,timestamptz,timestamptz,integer,boolean) is
  'Legacy manual allocation retained for administrator exceptions; routine adaptation is portal-managed.';
