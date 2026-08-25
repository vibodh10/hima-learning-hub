-- Curriculum authoring, approval and manual allocation are configuration
-- functions. Keep them available to administrators without exposing routine
-- content-management work to ordinary teachers.

do $$
declare
  function_signature regprocedure;
  current_definition text;
  restricted_definition text;
begin
  foreach function_signature in array array[
    'public.teacher_save_lesson(uuid,uuid,integer,text,text,text,text,text,text,jsonb,integer,text)'::regprocedure,
    'public.teacher_create_question(uuid,uuid,text,text,text,jsonb,jsonb,text,text,text,text,numeric,integer,jsonb,text)'::regprocedure,
    'public.teacher_set_content_status(text,uuid,text)'::regprocedure,
    'public.teacher_allocate_activity(uuid,uuid,uuid,text,timestamptz,timestamptz,boolean)'::regprocedure,
    'public.teacher_set_gamification(uuid,uuid,boolean,boolean,boolean)'::regprocedure,
    'public.teacher_create_assessment_blueprint(uuid,uuid,text,text,text)'::regprocedure,
    'public.teacher_create_activity(uuid,text,text,text,text,integer,integer,boolean,boolean,text,text,integer,text,uuid)'::regprocedure,
    'public.teacher_review_question(uuid,text,jsonb,jsonb,text,text,text,text,numeric,integer,text,text,uuid,text,text[],uuid[],jsonb)'::regprocedure
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

comment on function public.teacher_save_lesson(uuid,uuid,integer,text,text,text,text,text,text,jsonb,integer,text) is
  'Legacy function name retained for compatibility; curriculum configuration is administrator-only.';
comment on function public.teacher_allocate_activity(uuid,uuid,uuid,text,timestamptz,timestamptz,boolean) is
  'Legacy manual allocation function retained for exceptional administrator configuration; group journeys provide routine learning.';
