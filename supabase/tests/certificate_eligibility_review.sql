\set ON_ERROR_STOP on

begin;

select public.seed_achievement_configuration();

update public.user_profiles set role='administrator'
where id='90000000-0000-0000-0000-000000000001';

insert into public.certificate_eligibility_reviews(learner_id,level_id,status)
select '90000000-0000-0000-0000-000000000002',id,'pending_review'
from public.achievement_levels
where organisation_id='10000000-0000-0000-0000-000000000001' and code='gold'
on conflict(learner_id,level_id) do update set status='pending_review',reviewed_by=null,reviewed_at=null,review_note=null;

set request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
set local role authenticated;
select public.admin_review_certificate_eligibility(
  (select review.id from public.certificate_eligibility_reviews review
    join public.achievement_levels level on level.id=review.level_id
    where review.learner_id='90000000-0000-0000-0000-000000000002' and level.code='gold'),
  'confirmed','Eligibility evidence checked by authorised staff.'
);
reset role;

do $$
begin
  if not exists(select 1 from public.certificate_eligibility_reviews review
      join public.achievement_levels level on level.id=review.level_id
      where review.learner_id='90000000-0000-0000-0000-000000000002'
        and level.code='gold' and review.status='confirmed'
        and review.reviewed_by='90000000-0000-0000-0000-000000000001'
        and review.reviewed_at is not null) then
    raise exception 'authorised certificate eligibility review was not retained';
  end if;
  if not exists(select 1 from public.audit_logs
      where action='certificate_eligibility.reviewed'
        and entity_type='certificate_eligibility_review') then
    raise exception 'certificate eligibility review was not audited';
  end if;
end $$;

rollback;
