alter table public.exam_practice_attempts add column if not exists unit_code text not null default '14';

alter table public.exam_practice_attempts drop constraint if exists exam_practice_attempts_activity_check;
alter table public.exam_practice_attempts add constraint exam_practice_attempts_activity_check check(activity between 0 and 7);

alter table public.exam_practice_attempts drop constraint if exists exam_practice_attempts_unit_code_check;
alter table public.exam_practice_attempts add constraint exam_practice_attempts_unit_code_check check(unit_code in ('2','14'));

revoke insert on public.exam_practice_attempts from authenticated;
grant insert(class_id,unit_code,paper_id,activity,response) on public.exam_practice_attempts to authenticated;

drop policy if exists exam_practice_insert on public.exam_practice_attempts;
create policy exam_practice_insert on public.exam_practice_attempts for insert to authenticated
 with check(
   learner_id=auth.uid()
   and exists(
     select 1
     from public.enrolments e
     join public.class_units cu on cu.class_id=e.class_id
     join public.units u on u.id=cu.unit_id
     join public.classes c on c.id=e.class_id
     where e.student_id=auth.uid()
       and e.class_id=exam_practice_attempts.class_id
       and e.archived_at is null
       and cu.archived_at is null
       and cu.active
       and u.code=exam_practice_attempts.unit_code
       and c.published
       and c.archived_at is null
   )
 );

create index if not exists exam_practice_class_unit_date on public.exam_practice_attempts(class_id,unit_code,submitted_at desc);
