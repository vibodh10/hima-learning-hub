create table if not exists public.workbook_teacher_decisions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  learner_id uuid not null references public.user_profiles(id) on delete cascade,
  teacher_id uuid not null references public.user_profiles(id),
  unit_code text not null,
  topic_code text,
  decision_type text not null check (decision_type in ('assign_topic','assign_mastery_check','assign_progress_point','route_override','project_unlock','feedback','intervention','reflection_review')),
  original_route text,
  new_route text,
  reason text not null check (length(reason) >= 10),
  review_on date,
  created_at timestamptz not null default now(),
  check (decision_type not in ('route_override','project_unlock') or (original_route is not null and new_route is not null))
);

create or replace function public.scope_workbook_teacher_decision()
returns trigger language plpgsql security definer set search_path=public as $$
declare actor public.user_profiles;
begin
  select * into actor from public.user_profiles where id=auth.uid();
  if actor.role not in ('teacher','administrator') then raise exception 'teacher_required'; end if;
  if not exists (select 1 from public.user_profiles learner where learner.id=new.learner_id and learner.organisation_id=actor.organisation_id and learner.role='student') then raise exception 'learner_out_of_scope'; end if;
  new.teacher_id=actor.id; new.organisation_id=actor.organisation_id;
  return new;
end; $$;

drop trigger if exists scope_workbook_teacher_decision_before_insert on public.workbook_teacher_decisions;
create trigger scope_workbook_teacher_decision_before_insert before insert on public.workbook_teacher_decisions for each row execute function public.scope_workbook_teacher_decision();
alter table public.workbook_teacher_decisions enable row level security;
grant select,insert on public.workbook_teacher_decisions to authenticated;
create policy workbook_teacher_decisions_read on public.workbook_teacher_decisions for select to authenticated using (
  learner_id=auth.uid() or (select role from public.current_profile()) in ('teacher','administrator') and organisation_id=(select organisation_id from public.current_profile())
);
create policy workbook_teacher_decisions_insert on public.workbook_teacher_decisions for insert to authenticated with check ((select role from public.current_profile()) in ('teacher','administrator'));
