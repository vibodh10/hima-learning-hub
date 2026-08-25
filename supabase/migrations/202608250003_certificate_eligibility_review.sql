-- Authorised review for Gold and Diamond certificate eligibility. Eligibility
-- remains a review status and never issues or promises a college certificate.

create or replace function public.admin_review_certificate_eligibility(
  review_uuid uuid,status_value text,note_value text
) returns void language plpgsql security definer set search_path=''
as $$
declare actor public.user_profiles; review_row public.certificate_eligibility_reviews; learner_org uuid;
begin
  actor:=public.current_profile();
  if actor.id is null or actor.role<>'administrator'
    or status_value not in ('confirmed','declined')
    or length(trim(note_value)) not between 5 and 1000 then
    raise exception 'certificate_review_not_available' using errcode='42501';
  end if;

  select review.* into review_row
  from public.certificate_eligibility_reviews review
  join public.achievement_levels level on level.id=review.level_id
  where review.id=review_uuid and level.organisation_id=actor.organisation_id
    and level.certificate_eligible and review.status='pending_review'
  for update of review;
  if review_row.id is null then
    raise exception 'certificate_review_not_available' using errcode='42501';
  end if;
  select organisation_id into learner_org from public.user_profiles where id=review_row.learner_id;
  if learner_org is distinct from actor.organisation_id then
    raise exception 'certificate_review_not_available' using errcode='42501';
  end if;

  update public.certificate_eligibility_reviews set status=status_value,
    reviewed_by=actor.id,reviewed_at=now(),review_note=trim(note_value)
  where id=review_uuid;
  insert into public.audit_logs(organisation_id,actor_id,action,entity_type,entity_id,after_data)
  values(actor.organisation_id,actor.id,'certificate_eligibility.reviewed','certificate_eligibility_review',review_uuid,
    jsonb_build_object('status',status_value,'review_note',trim(note_value),'learner_id',review_row.learner_id,'level_id',review_row.level_id));
end $$;

revoke all on function public.admin_review_certificate_eligibility(uuid,text,text) from public,anon;
grant execute on function public.admin_review_certificate_eligibility(uuid,text,text) to authenticated;

comment on function public.admin_review_certificate_eligibility(uuid,text,text) is
  'Administrator-only, audited review of threshold eligibility. Confirmation records review; it does not issue or promise an SCCB certificate.';
