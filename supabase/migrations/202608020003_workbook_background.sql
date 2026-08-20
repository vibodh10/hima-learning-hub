-- Self-reported background is intentionally isolated from academic evidence so
-- it can inform support without increasing mastery or fast-track decisions.
create table if not exists public.learner_workbook_background (
  learner_id uuid primary key references public.user_profiles(id) on delete cascade,
  experience text,
  support_needs text,
  updated_at timestamptz not null default now()
);
alter table public.learner_workbook_background enable row level security;
grant select,insert,update on public.learner_workbook_background to authenticated;
create policy learner_workbook_background_read on public.learner_workbook_background for select to authenticated using (
  public.can_access_learner(learner_id)
);
create policy learner_workbook_background_insert on public.learner_workbook_background for insert to authenticated with check (learner_id=auth.uid() and (select role from public.current_profile())='student');
create policy learner_workbook_background_update on public.learner_workbook_background for update to authenticated using (learner_id=auth.uid()) with check (learner_id=auth.uid());

comment on table public.learner_workbook_background is 'Self-reported learner context; never academic mastery evidence.';
