\set ON_ERROR_STOP on

begin;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'public.learning_aims','public.skills','public.teaching_screens',
    'public.worked_examples','public.weekly_plans',
    'public.weekly_plan_activities','public.gamification_settings'
  ] loop
    if has_table_privilege('authenticated',table_name,'INSERT')
      or has_table_privilege('authenticated',table_name,'UPDATE')
      or has_table_privilege('authenticated',table_name,'DELETE') then
      raise exception 'authenticated retains direct DML on %',table_name;
    end if;
  end loop;

  begin
    update public.skills set title=title
    where id=(select id from public.skills limit 1);
    raise exception 'ordinary teacher unexpectedly updated curriculum directly';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.teacher_save_weekly_plan(
      'a0000000-0000-0000-0000-000000000001',current_date,
      'Teacher bypass check',1,true,now(),now()+interval '7 days'
    );
    raise exception 'ordinary teacher unexpectedly used administrator configuration RPC';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

update public.user_profiles set role='administrator'
where id='90000000-0000-0000-0000-000000000001';

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;

select public.teacher_save_weekly_plan(
  'a0000000-0000-0000-0000-000000000001',current_date,
  'Audited administrator plan',1,true,now(),now()+interval '7 days'
);
select public.teacher_set_gamification(
  'a0000000-0000-0000-0000-000000000001',null,false,false,false
);

do $$
begin
  begin
    update public.gamification_settings set coins_enabled=true
    where class_id='a0000000-0000-0000-0000-000000000001';
    raise exception 'administrator unexpectedly bypassed audited settings RPC';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

do $$
begin
  if not exists(
    select 1 from public.audit_logs
    where action='weekly_plan.saved'
      and after_data->>'class_id'='a0000000-0000-0000-0000-000000000001'
  ) then
    raise exception 'administrator weekly plan was not audited';
  end if;
  if not exists(
    select 1 from public.audit_logs
    where action='gamification.updated'
      and after_data->>'class_id'='a0000000-0000-0000-0000-000000000001'
  ) then
    raise exception 'administrator gamification change was not audited';
  end if;
end $$;

rollback;
