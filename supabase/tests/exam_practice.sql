begin;
-- The standalone PostgreSQL fixture lacks Supabase's default read grants.
grant select on public.enrolments,public.class_units,public.units,public.classes,public.user_profiles to authenticated;
create temporary table exam_fixture(class_id uuid);
grant all on exam_fixture to authenticated;
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
insert into exam_fixture values(public.create_class('Exam practice QA','30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','EXAM-QA'));
reset role;
update public.classes set published=true where id=(select class_id from exam_fixture);
insert into public.class_units(class_id,unit_id,active) select f.class_id,u.id,true from exam_fixture f cross join public.units u where u.code='14' limit 1;
insert into public.enrolments(class_id,student_id) select class_id,'90000000-0000-0000-0000-000000000002' from exam_fixture;
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000002';
set local role authenticated;
insert into public.exam_practice_attempts(class_id,paper_id,activity,response) select class_id,'guided',0,repeat('A reasoned response. ',4) from exam_fixture;
update public.exam_practice_attempts set reflection='I will connect my choice to the scenario.',reviewed_at=now();
do $$ begin
 if (select count(*) from public.exam_practice_attempts)<>1 then raise exception 'Own answer unavailable'; end if;
 if has_column_privilege('authenticated','public.exam_practice_attempts','response','UPDATE') then raise exception 'Original answer can be overwritten'; end if;
 if has_column_privilege('authenticated','public.exam_practice_attempts','learner_id','INSERT') then raise exception 'Identity can be forged'; end if;
end $$;
set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
do $$ begin
 if (select count(*) from public.exam_practice_attempts)<>1 then raise exception 'Teacher cannot review'; end if;
 update public.exam_practice_attempts set reflection='Teacher overwrite';
 if found then raise exception 'Teacher overwrote self review'; end if;
end $$;
set request.jwt.claim.sub='90000000-0000-0000-0000-999999999999';
do $$ begin
 if exists(select 1 from public.exam_practice_attempts) then raise exception 'Unrelated user can read answer'; end if;
 begin
 insert into public.exam_practice_attempts(class_id,paper_id,activity,response) select class_id,'guided',0,repeat('Unauthorised response. ',4) from exam_fixture;
 raise exception 'Unenrolled write accepted';
 exception when insufficient_privilege then null; end;
end $$;
rollback;
