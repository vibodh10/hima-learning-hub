\set ON_ERROR_STOP on
begin;
grant select on public.units,public.topics,public.lessons,public.activities to authenticated;
-- Isolated fixtures, never production accounts.
insert into auth.users(id,email) values ('90000000-0000-0000-0000-000000000003','second-teacher@example.invalid');
insert into public.user_profiles(id,organisation_id,role,display_name)
values ('90000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','teacher','Second teacher');
update public.enrolments set archived_at=now() where student_id='90000000-0000-0000-0000-000000000002';
create temporary table selected_groups(label text,id uuid);
grant all on selected_groups to authenticated;
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
insert into selected_groups values ('website', public.create_class('Website group','30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','WEB-ONLY'));
select public.teacher_configure_class((select id from selected_groups where label='website'),'Website group','21000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',array['40000000-0000-0000-0000-000000000006'::uuid],'40000000-0000-0000-0000-000000000006','2026-09-01','2026-12-18',array[1,2],true);
reset role;
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000003';
set local role authenticated;
insert into selected_groups values ('programming', public.create_class('Programming group','30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','CODE-ONLY'));
select public.teacher_configure_class((select id from selected_groups where label='programming'),'Programming group','21000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',array['40000000-0000-0000-0000-000000000004'::uuid],'40000000-0000-0000-0000-000000000004','2026-09-01','2026-12-18',array[3],true);
do $$ begin
  begin
    perform public.teacher_configure_class((select id from selected_groups where label='website'),'Other teacher edit','21000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',array['40000000-0000-0000-0000-000000000004'::uuid],'40000000-0000-0000-0000-000000000004','2026-09-01','2026-12-18',array[3],true);
    raise exception 'teacher changed another teachers group';
  exception when sqlstate '42501' then null; end;
end $$;
reset role;
insert into public.enrolments(class_id,student_id) select id,'90000000-0000-0000-0000-000000000002' from selected_groups where label='website';
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set local role authenticated;
do $$ begin
  if not public.can_access_unit('40000000-0000-0000-0000-000000000006') then raise exception 'assigned unit blocked'; end if;
  if public.can_access_unit('43000000-0000-0000-0000-000000000001') then raise exception 'unassigned Unit 1 accessible'; end if;
  if public.can_access_unit('40000000-0000-0000-0000-000000000004') then raise exception 'other teachers unit accessible'; end if;
  if exists(select 1 from public.units where code in ('1','4')) then raise exception 'unassigned units visible through RLS'; end if;
  if exists(select 1 from public.activities where assessment_kind='course_starting_point') then raise exception 'unassigned course baseline visible'; end if;
  begin
    perform public.submit_activity('72000000-0000-0000-0000-000000000001','{}'::jsonb,0);
    raise exception 'direct unassigned submission accepted';
  exception when sqlstate '42501' then null; end;
  begin
    perform * from public.learner_activity_states('65000000-0000-0000-0000-000000000010');
    raise exception 'unassigned activity states exposed';
  exception when sqlstate '42501' then null; end;
  begin
    perform public.record_learner_activity_position('65000000-0000-0000-0000-000000000010','72000000-0000-0000-0000-000000000001');
    raise exception 'direct baseline activity access accepted';
  exception when sqlstate '42501' then null; end;
  begin
    perform public.teacher_configure_class((select id from selected_groups where label='website'),'Student edit','21000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',array['40000000-0000-0000-0000-000000000004'::uuid],'40000000-0000-0000-0000-000000000004','2026-09-01','2026-12-18',array[3],true);
    raise exception 'student changed assigned units';
  exception when sqlstate '42501' then null; end;
end $$;
reset role;
update public.enrolments set archived_at=now() where class_id=(select id from selected_groups where label='website');
insert into public.enrolments(class_id,student_id) select id,'90000000-0000-0000-0000-000000000002' from selected_groups where label='programming';
set local role authenticated;
do $$ begin
  if public.can_access_unit('40000000-0000-0000-0000-000000000006') then raise exception 'archived enrollment still grants access'; end if;
  if not public.can_access_unit('40000000-0000-0000-0000-000000000004') then raise exception 'second group assigned unit blocked'; end if;
end $$;
reset role;
update public.classes set published=false where id=(select id from selected_groups where label='programming');
set local role authenticated;
do $$ begin
  if public.can_access_unit('40000000-0000-0000-0000-000000000004') then raise exception 'unpublished group visible'; end if;
end $$;
reset role;
rollback;
