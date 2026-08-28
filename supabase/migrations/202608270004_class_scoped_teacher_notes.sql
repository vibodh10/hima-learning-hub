-- New teacher notes are explicitly scoped to the class in which the evidence
-- was observed. Historical notes remain nullable rather than being guessed.

alter table public.teacher_notes
  add column if not exists class_id uuid references public.classes(id);

create index if not exists teacher_notes_class_learner_idx
  on public.teacher_notes(class_id,learner_id,created_at desc)
  where archived_at is null and class_id is not null;

create or replace function public.same_organisation_learner(learner_uuid uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists (
    select 1
    from public.user_profiles actor
    join public.user_profiles learner
      on learner.id=learner_uuid
      and learner.organisation_id=actor.organisation_id
    where actor.id=auth.uid()
      and actor.archived_at is null
      and learner.archived_at is null
  )
$$;

revoke all on function public.same_organisation_learner(uuid) from public,anon;
grant execute on function public.same_organisation_learner(uuid) to authenticated;

drop policy if exists notes_select_teacher on public.teacher_notes;
grant select on public.teacher_notes to authenticated;
create policy notes_select_teacher on public.teacher_notes
for select to authenticated using (
  teacher_id=auth.uid()
  or (public.is_admin() and public.same_organisation_learner(learner_id))
);

create or replace function public.teacher_record_learner_note(
  learner_uuid uuid,
  class_uuid uuid,
  note_value text
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare
  actor public.user_profiles;
  note_uuid uuid;
begin
  actor:=public.current_profile();
  if actor.id is null
    or actor.role not in ('teacher','administrator')
    or length(trim(note_value)) not between 5 and 2000
    or not public.can_manage_class(class_uuid)
    or not exists (
      select 1
      from public.classes class
      join public.enrolments enrolment on enrolment.class_id=class.id
      join public.user_profiles learner on learner.id=enrolment.student_id
      where class.id=class_uuid
        and class.organisation_id=actor.organisation_id
        and class.archived_at is null
        and enrolment.student_id=learner_uuid
        and enrolment.archived_at is null
        and learner.role='student'
        and learner.archived_at is null
        and learner.organisation_id=actor.organisation_id
    ) then
    raise exception 'not_authorised' using errcode='42501';
  end if;

  insert into public.teacher_notes(learner_id,teacher_id,class_id,note)
  values(learner_uuid,actor.id,class_uuid,trim(note_value))
  returning id into note_uuid;

  insert into public.audit_logs(
    organisation_id,actor_id,action,entity_type,entity_id,after_data
  ) values (
    actor.organisation_id,actor.id,'learner.teacher_note_recorded','teacher_note',note_uuid,
    jsonb_build_object('learner_id',learner_uuid,'class_id',class_uuid)
  );

  return note_uuid;
end;
$$;

revoke all on function public.teacher_record_learner_note(uuid,uuid,text) from public,anon;
grant execute on function public.teacher_record_learner_note(uuid,uuid,text) to authenticated;

comment on column public.teacher_notes.class_id is
  'Class evidence boundary for new notes. Null identifies a historical note whose class must not be inferred.';
