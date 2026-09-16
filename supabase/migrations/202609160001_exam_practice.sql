create table public.exam_practice_attempts (
 id uuid primary key default gen_random_uuid(),
 learner_id uuid not null default auth.uid() references public.user_profiles(id),
 class_id uuid not null references public.classes(id),
 paper_id text not null check(length(paper_id) between 1 and 80),
 activity integer not null check(activity between 0 and 4),
 response text not null check(length(trim(response)) between 40 and 50000),
 reflection text check(length(reflection)<=6000),
 submitted_at timestamptz not null default now(),
 reviewed_at timestamptz
);
alter table public.exam_practice_attempts enable row level security;
revoke all on public.exam_practice_attempts from anon,authenticated;
grant select on public.exam_practice_attempts to authenticated;
grant insert(class_id,paper_id,activity,response) on public.exam_practice_attempts to authenticated;
grant update(reflection,reviewed_at) on public.exam_practice_attempts to authenticated;
create policy exam_practice_read on public.exam_practice_attempts for select to authenticated
 using(learner_id=auth.uid() or public.can_manage_class(class_id));
create policy exam_practice_insert on public.exam_practice_attempts for insert to authenticated
 with check(learner_id=auth.uid() and exists(
   select 1 from public.enrolments e join public.class_units cu on cu.class_id=e.class_id
   join public.units u on u.id=cu.unit_id join public.classes c on c.id=e.class_id
   where e.student_id=auth.uid() and e.class_id=exam_practice_attempts.class_id
   and e.archived_at is null and cu.archived_at is null and cu.active
   and u.code='14' and c.published and c.archived_at is null
 ));
create policy exam_practice_reflect on public.exam_practice_attempts for update to authenticated
 using(learner_id=auth.uid()) with check(learner_id=auth.uid());
create index exam_practice_class_date on public.exam_practice_attempts(class_id,submitted_at desc);
