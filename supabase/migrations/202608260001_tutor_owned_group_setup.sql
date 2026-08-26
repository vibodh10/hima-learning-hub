-- Tutors own the deliberate first-use workflow for their assigned groups:
-- create a group, select its programme/units, then invite learners. The RPCs
-- still enforce organisation membership and can_manage_class server-side.

do $$
declare
  function_signature regprocedure;
  current_definition text;
  restored_definition text;
begin
  foreach function_signature in array array[
    'public.create_class(text,uuid,uuid,text)'::regprocedure,
    'public.teacher_configure_class(uuid,text,uuid,uuid,uuid[],uuid,date,date,integer,boolean)'::regprocedure
  ] loop
    select pg_get_functiondef(function_signature) into current_definition;
    restored_definition := replace(
      current_definition,
      'role=''administrator''',
      'role in (''teacher'',''administrator'')'
    );
    if restored_definition = current_definition then
      raise exception 'administrator-only guard was not found in %', function_signature;
    end if;
    execute restored_definition;
  end loop;
end $$;

comment on function public.create_class(text,uuid,uuid,text) is
  'Teacher-owned group creation. The caller becomes lead teacher; organisation and curriculum are validated server-side.';
comment on function public.teacher_configure_class(uuid,text,uuid,uuid,uuid[],uuid,date,date,integer,boolean) is
  'Teachers configure only groups they manage; administrators retain organisation-wide access.';
