\set ON_ERROR_STOP on
begin;
create temporary table mini_fixture(class_id uuid,session_id uuid);
grant all on mini_fixture to authenticated,service_role;
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
insert into mini_fixture(class_id) values(public.create_class('Mini study QA','30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','MINI-QA'));
select public.teacher_configure_class((select class_id from mini_fixture),'Mini study QA','21000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',array['40000000-0000-0000-0000-000000000006'::uuid],'40000000-0000-0000-0000-000000000006','2026-09-01','2026-12-18',array[1,2],true);
reset role;
insert into public.enrolments(class_id,student_id) select class_id,'90000000-0000-0000-0000-000000000002' from mini_fixture;
set local role service_role;
do $$ declare baseline_id uuid; begin
 begin
  perform public.open_mini_study('90000000-0000-0000-0000-000000000002',(select class_id from mini_fixture),'40000000-0000-0000-0000-000000000006','too-early','daily','{}','[{}]');
  raise exception 'daily step skipped starting point';
 exception when raise_exception then if sqlerrm<>'starting_point_required' then raise; end if; end;
 baseline_id:=public.open_mini_study('90000000-0000-0000-0000-000000000002',(select class_id from mini_fixture),'40000000-0000-0000-0000-000000000006','qa-baseline','baseline','{}','[{}]');
 perform public.check_mini_study('90000000-0000-0000-0000-000000000002',baseline_id,'{"correct":1,"total":1,"feedback":[]}','Keep practising.');
 perform public.finish_mini_study('90000000-0000-0000-0000-000000000002',baseline_id);
 update public.mini_study_sessions set completed_at=now()-interval '1 day' where id=baseline_id;
 begin
  perform public.open_mini_study('90000000-0000-0000-0000-000000000002',(select class_id from mini_fixture),'40000000-0000-0000-0000-000000000006','new-baseline-version','baseline','{}','[{}]');
  raise exception 'starting point repeated';
 exception when raise_exception then if sqlerrm<>'starting_point_already_recorded' then raise; end if; end;
end $$;
update mini_fixture set session_id=public.open_mini_study('90000000-0000-0000-0000-000000000002',class_id,'40000000-0000-0000-0000-000000000006','qa-daily','daily','{"title":"QA only"}','[{"id":"qa","answer":"one"}]');
do $$ declare saved uuid; extra_id uuid; response jsonb; begin
  select session_id into saved from mini_fixture;
  if public.open_mini_study('90000000-0000-0000-0000-000000000002',(select class_id from mini_fixture),'40000000-0000-0000-0000-000000000006','different','daily','{}','[{}]')<>saved then raise exception 'duplicate active session'; end if;
  begin
    perform public.open_mini_study('90000000-0000-0000-0000-000000000002',(select class_id from mini_fixture),'40000000-0000-0000-0000-000000000004','foreign','daily','{}','[{}]');
    raise exception 'other unit accepted';
  exception when sqlstate '42501' then null; end;
  begin
    perform public.finish_mini_study('90000000-0000-0000-0000-000000000002',saved);
    raise exception 'reward before answers';
  exception when raise_exception then if sqlerrm<>'check_answers_first' then raise; end if; end;
  response:=public.check_mini_study('90000000-0000-0000-0000-000000000002',saved,'{"correct":0,"total":1,"feedback":[{"correct":false,"skill":"purpose"}]}','Review purpose.');
  response:=public.check_mini_study('90000000-0000-0000-0000-000000000002',saved,'{"correct":1,"total":1,"feedback":[]}','Overwrite');
  if response->>'correct'<>'0' then raise exception 'first answers overwritten'; end if;
  response:=public.finish_mini_study('90000000-0000-0000-0000-000000000002',saved);
  if response->>'xp'<>'20' or response->>'badge'<>'First small step' then raise exception 'missing reward'; end if;
  if public.finish_mini_study('90000000-0000-0000-0000-000000000002',saved)<>response then raise exception 'retry not idempotent'; end if;
  extra_id:=public.open_mini_study('90000000-0000-0000-0000-000000000002',(select class_id from mini_fixture),'40000000-0000-0000-0000-000000000006','optional-extra','daily','{}','[{}]');
  if extra_id is null or extra_id=saved then raise exception 'optional same-day lesson missing'; end if;
  perform public.check_mini_study('90000000-0000-0000-0000-000000000002',extra_id,'{"correct":1,"total":1,"feedback":[]}','Recall the idea.');
  response:=public.finish_mini_study('90000000-0000-0000-0000-000000000002',extra_id);
  if response->>'xp'<>'20' or response->>'badge' is not null then raise exception 'extra lesson reward incorrect'; end if;
  if public.finish_mini_study('90000000-0000-0000-0000-000000000002',extra_id)<>response then raise exception 'extra reward retry not idempotent'; end if;
  if (select count(*) from public.learner_achievement_point_events where idempotency_key='mini:'||extra_id::text)<>1 then raise exception 'duplicate extra XP'; end if;
end $$;
reset role;
do $$ begin
 if (select count(*) from public.learner_achievement_point_events where idempotency_key='mini:'||(select session_id::text from mini_fixture))<>1 then raise exception 'duplicate XP'; end if;
 if (select count(*) from public.badge_awards where evidence->>'mini_study_session'=(select session_id::text from mini_fixture))<>1 then raise exception 'duplicate badge'; end if;
 if not (select needs_help from public.mini_study_sessions where id=(select session_id from mini_fixture)) then raise exception 'help signal missing'; end if;
end $$;
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set local role authenticated;
do $$ begin
 if exists(select 1 from public.mini_study_sessions) then raise exception 'student can read private answer keys'; end if;
 begin
  perform public.finish_mini_study('90000000-0000-0000-0000-000000000002',(select session_id from mini_fixture));
  raise exception 'student can call reward RPC directly';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
do $$ begin
 if not exists(select 1 from public.mini_study_sessions where id=(select session_id from mini_fixture)) then raise exception 'teacher report missing own student'; end if;
end $$;
reset role;
-- A different teacher must not receive this group's learner answers or target.
insert into auth.users(id,email) values('91000000-0000-0000-0000-000000000099','mini-other-teacher@example.invalid');
insert into public.user_profiles(id,organisation_id,role,display_name) values('91000000-0000-0000-0000-000000000099','10000000-0000-0000-0000-000000000001','teacher','Isolated other teacher');
set request.jwt.claim.sub='91000000-0000-0000-0000-000000000099';
set local role authenticated;
do $$ begin
 if exists(select 1 from public.mini_study_sessions where id=(select session_id from mini_fixture)) then raise exception 'another teacher can see mini learning records'; end if;
end $$;
reset role;
-- Advance only the disposable fixture's completion date; real clocks remain authoritative in the RPC.
update public.mini_study_sessions set completed_at=now()-interval '1 day' where id=(select session_id from mini_fixture);
set local role service_role;
do $$ declare next_id uuid; begin
 next_id:=public.open_mini_study('90000000-0000-0000-0000-000000000002',(select class_id from mini_fixture),'40000000-0000-0000-0000-000000000006','next-daily','daily','{}','[{}]');
 if next_id is null or next_id=(select session_id from mini_fixture) then raise exception 'next day does not permit the next step'; end if;
end $$;
reset role;
-- Exact assignment is rechecked on every operation, even for a known saved session.
update public.classes set published=false where id=(select class_id from mini_fixture);
set local role service_role;
do $$ begin
 begin
  perform public.finish_mini_study('90000000-0000-0000-0000-000000000002',(select session_id from mini_fixture));
  raise exception 'unpublished unit still accessible';
 exception when sqlstate '42501' then null; end;
end $$;
reset role;
rollback;
