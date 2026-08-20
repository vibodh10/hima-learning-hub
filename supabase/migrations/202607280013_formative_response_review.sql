create table public.formative_response_reviews(
  id uuid primary key default gen_random_uuid(),
  attempt_answer_id uuid not null unique references public.attempt_answers(id),
  learner_id uuid not null references public.user_profiles(id),
  status text not null default 'pending' check(status in ('pending','reviewed','returned')),
  reviewed_mark numeric(6,2),
  feedback text,
  reviewed_by uuid references public.user_profiles(id),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check(reviewed_mark is null or reviewed_mark>=0)
);

create or replace function public.queue_formative_response_review()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if exists(select 1 from public.questions q where q.id=new.question_id
    and q.kind in ('extended_response','reflection')) then
    insert into public.formative_response_reviews(attempt_answer_id,learner_id)
    select new.id,a.learner_id from public.attempts a where a.id=new.attempt_id
    on conflict(attempt_answer_id) do nothing;
  end if;
  return new;
end $$;

create trigger queue_formative_response_review_after_answer
after insert on public.attempt_answers
for each row execute function public.queue_formative_response_review();

insert into public.formative_response_reviews(attempt_answer_id,learner_id)
select aa.id,a.learner_id
from public.attempt_answers aa
join public.attempts a on a.id=aa.attempt_id
join public.questions q on q.id=aa.question_id
where q.kind in ('extended_response','reflection')
on conflict(attempt_answer_id) do nothing;

alter table public.formative_response_reviews enable row level security;
create policy formative_review_authorised_read
on public.formative_response_reviews for select
using(auth.uid()=learner_id or public.can_access_learner(learner_id));
revoke insert,update,delete on public.formative_response_reviews from authenticated;
grant select on public.formative_response_reviews to authenticated;

create or replace function public.teacher_review_formative_response(
  review_uuid uuid,
  mark_value numeric,
  feedback_value text,
  return_for_practice boolean default false
) returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  actor public.user_profiles;
  review_row public.formative_response_reviews;
  answer_row public.attempt_answers;
  attempt_uuid uuid;
  topic_uuid uuid;
  total_mark numeric;
  total_max numeric;
  new_percentage numeric;
begin
  select * into actor from public.user_profiles
  where id=auth.uid() and role in ('teacher','administrator') and archived_at is null;
  select * into review_row from public.formative_response_reviews where id=review_uuid;
  select * into answer_row from public.attempt_answers where id=review_row.attempt_answer_id;
  if actor.id is null or review_row.id is null
    or not public.can_access_learner(review_row.learner_id)
    or mark_value<0 or mark_value>answer_row.max_mark
    or length(trim(feedback_value))<3 then
    raise exception 'invalid_formative_review' using errcode='22023';
  end if;

  update public.attempt_answers
  set mark=mark_value,
      is_correct=mark_value=answer_row.max_mark,
      feedback=trim(feedback_value),
      teacher_override_by=actor.id
  where id=answer_row.id;

  attempt_uuid:=answer_row.attempt_id;
  select sum(mark),sum(max_mark) into total_mark,total_max
  from public.attempt_answers where attempt_id=attempt_uuid;
  new_percentage:=case when total_max=0 then 0 else round(total_mark/total_max*100,2) end;
  update public.attempts
  set mark=total_mark,max_mark=total_max,percentage=new_percentage,
      pathway=public.pathway_for(new_percentage,hints_used),
      teacher_override_by=actor.id,
      teacher_override_reason='Formative extended-response review'
  where id=attempt_uuid;

  select l.topic_id into topic_uuid
  from public.attempts a
  join public.activities activity on activity.id=a.activity_id
  join public.lessons l on l.id=activity.lesson_id
  where a.id=attempt_uuid;

  update public.topic_progress tp set
    latest_score=(
      select a.percentage from public.attempts a
      join public.activities activity on activity.id=a.activity_id
      join public.lessons l on l.id=activity.lesson_id
      where a.learner_id=review_row.learner_id and l.topic_id=topic_uuid
        and a.completed_at is not null
      order by a.completed_at desc limit 1
    ),
    best_score=(
      select max(a.percentage) from public.attempts a
      join public.activities activity on activity.id=a.activity_id
      join public.lessons l on l.id=activity.lesson_id
      where a.learner_id=review_row.learner_id and l.topic_id=topic_uuid
    ),
    average_score=(
      select round(avg(a.percentage),2) from public.attempts a
      join public.activities activity on activity.id=a.activity_id
      join public.lessons l on l.id=activity.lesson_id
      where a.learner_id=review_row.learner_id and l.topic_id=topic_uuid
    ),
    current_pathway=public.pathway_for(new_percentage,0),
    updated_at=now()
  where tp.learner_id=review_row.learner_id and tp.topic_id=topic_uuid;

  update public.formative_response_reviews
  set status=case when return_for_practice then 'returned' else 'reviewed' end,
      reviewed_mark=mark_value,feedback=trim(feedback_value),
      reviewed_by=actor.id,reviewed_at=now()
  where id=review_uuid;

  insert into public.audit_logs(
    organisation_id,actor_id,action,entity_type,entity_id,after_data
  ) values(
    actor.organisation_id,actor.id,'formative_response.reviewed',
    'formative_response_review',review_uuid,
    jsonb_build_object('learner_id',review_row.learner_id,'mark',mark_value,
      'max_mark',answer_row.max_mark,'returned_for_practice',return_for_practice)
  );
end $$;

revoke all on function public.teacher_review_formative_response(uuid,numeric,text,boolean) from public;
grant execute on function public.teacher_review_formative_response(uuid,numeric,text,boolean) to authenticated;

