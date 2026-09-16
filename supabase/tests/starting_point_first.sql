begin;
create temporary table sp_fixture(class_id uuid,old_id uuid,new_id uuid);
grant all on sp_fixture to authenticated;
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
insert into sp_fixture(class_id) values(public.create_class('Starting first QA','30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','START-QA'));
select public.teacher_configure_class((select class_id from sp_fixture),'Starting first QA','21000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',array['40000000-0000-0000-0000-000000000006'::uuid],'40000000-0000-0000-0000-000000000006','2026-09-01','2026-12-18',array[1],true);
reset role;
insert into public.enrolments(class_id,student_id) select class_id,'90000000-0000-0000-0000-000000000002' from sp_fixture;
with old as(insert into public.mini_study_sessions(learner_id,class_id,unit_id,unit_code,lesson_id,kind,content,question_keys) select '90000000-0000-0000-0000-000000000002',class_id,'40000000-0000-0000-0000-000000000006','6','older-baseline','baseline','{"title":"Preserved"}','[{}]' from sp_fixture returning id) update sp_fixture set old_id=(select id from old);
update sp_fixture set new_id=public.open_mini_study('90000000-0000-0000-0000-000000000002',class_id,'40000000-0000-0000-0000-000000000006','it-prerequisites-10-v1','baseline','{}',(select jsonb_agg('{}'::jsonb) from generate_series(1,10)));
do $$ begin
 if not exists(select 1 from public.mini_study_sessions where id=(select old_id from sp_fixture) and paused_for_starting_point and content->>'title'='Preserved') then raise exception 'Old work not preserved'; end if;
 if not exists(select 1 from public.mini_study_sessions where id=(select new_id from sp_fixture) and jsonb_array_length(question_keys)=10 and not paused_for_starting_point) then raise exception 'New assessment not opened'; end if;
end $$;
update public.mini_study_sessions set status='completed',completed_at=now(),grade='{"correct":8,"total":10,"feedback":[]}' where id=(select new_id from sp_fixture);
do $$ declare resumed uuid; begin
 resumed:=public.open_mini_study('90000000-0000-0000-0000-000000000002',(select class_id from sp_fixture),'40000000-0000-0000-0000-000000000006','next','daily','{}','[{}]');
 if resumed<>(select old_id from sp_fixture) then raise exception 'Old work not resumed'; end if;
end $$;
rollback;
