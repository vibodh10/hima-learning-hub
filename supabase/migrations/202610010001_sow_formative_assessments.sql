create table if not exists public.sow_formative_assessments (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  source_name text,
  title text not null,
  purpose text not null default '',
  questions jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sow_formative_questions_array check (jsonb_typeof(questions) = 'array')
);

create table if not exists public.sow_formative_submissions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.sow_formative_assessments(id) on delete cascade,
  learner_id uuid not null references public.profiles(id) on delete cascade,
  responses jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now(),
  unique (assessment_id, learner_id),
  constraint sow_formative_responses_array check (jsonb_typeof(responses) = 'array')
);

create index if not exists sow_formative_assessments_class_idx
  on public.sow_formative_assessments(class_id, status, published_at);
create index if not exists sow_formative_submissions_assessment_idx
  on public.sow_formative_submissions(assessment_id, submitted_at);

alter table public.sow_formative_assessments enable row level security;
alter table public.sow_formative_submissions enable row level security;
