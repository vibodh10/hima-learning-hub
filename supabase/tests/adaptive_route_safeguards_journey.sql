\set ON_ERROR_STOP on

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',v.id,'authenticated','authenticated',
  v.email,extensions.crypt('RouteTest!26',extensions.gen_salt('bf')),now(),'{}','{}',now(),now()
from (values
 ('91000000-0000-0000-0000-000000000001'::uuid,'route.full@example.invalid'),
 ('91000000-0000-0000-0000-000000000002'::uuid,'route.reduced@example.invalid'),
 ('91000000-0000-0000-0000-000000000003'::uuid,'route.check@example.invalid'),
 ('91000000-0000-0000-0000-000000000004'::uuid,'route.fast@example.invalid')
) v(id,email);
insert into public.user_profiles(id,organisation_id,role,display_name)
select id,'10000000-0000-0000-0000-000000000001','student',name
from (values
 ('91000000-0000-0000-0000-000000000001'::uuid,'Full Path Learner'),
 ('91000000-0000-0000-0000-000000000002'::uuid,'Reduced Practice Learner'),
 ('91000000-0000-0000-0000-000000000003'::uuid,'Mastery Check Learner'),
 ('91000000-0000-0000-0000-000000000004'::uuid,'Fast Track Learner')
) v(id,name);
insert into public.enrolments(class_id,student_id)
select 'a0000000-0000-0000-0000-000000000001',id from (values
 ('91000000-0000-0000-0000-000000000001'::uuid),
 ('91000000-0000-0000-0000-000000000002'::uuid),
 ('91000000-0000-0000-0000-000000000003'::uuid),
 ('91000000-0000-0000-0000-000000000004'::uuid)
) v(id);

insert into public.skill_mastery(
  learner_id,skill_id,first_attempt_accuracy,latest_accuracy,best_accuracy,
  mastery_score,current_pathway,attempts_count
)
select '91000000-0000-0000-0000-000000000003',s.id,65,65,65,65,'Core',1
from public.skills s where s.topic_id='51000000-0000-0000-0000-000000000001';

create temporary table route_answers(label text primary key,payload jsonb);
insert into route_answers values
('starting','{"81000000-0000-0000-0000-000000000025":"7","81000000-0000-0000-0000-000000000026":"str, int, float","81000000-0000-0000-0000-000000000027":"distance = float(input(\"Distance: \"))","81000000-0000-0000-0000-000000000028":"7.0","81000000-0000-0000-0000-000000000029":"logic error"}'),
('progress','{"81000000-0000-0000-0000-000000000030":"13","81000000-0000-0000-0000-000000000031":"bool","81000000-0000-0000-0000-000000000032":"int","81000000-0000-0000-0000-000000000033":"24","81000000-0000-0000-0000-000000000034":"total = price * quantity"}');
grant select on route_answers to authenticated;

set request.jwt.claim.sub='91000000-0000-0000-0000-000000000001';
set role authenticated;
do $$ begin
  perform public.submit_activity('72000000-0000-0000-0000-000000000002','{}',0);
end $$;
reset role;

set request.jwt.claim.sub='91000000-0000-0000-0000-000000000002';
set role authenticated;
do $$ begin
  perform public.submit_activity(
    '72000000-0000-0000-0000-000000000002',
    (select payload from route_answers where label='starting'),
    0
  );
end $$;
reset role;

set request.jwt.claim.sub='91000000-0000-0000-0000-000000000003';
set role authenticated;
do $$ begin
  perform public.submit_activity(
    '72000000-0000-0000-0000-000000000002',
    (select payload from route_answers where label='starting'),
    6
  );
end $$;
reset role;

-- The safeguard journey deliberately exercises an exceptional fast-track
-- progress point; model that as an audited teacher override.
insert into public.activity_unlock_overrides(
  learner_id,activity_id,teacher_id,reason
) values(
  '91000000-0000-0000-0000-000000000004',
  '72000000-0000-0000-0000-000000000003',
  '90000000-0000-0000-0000-000000000001',
  'Automated fast-track safeguard journey'
);

set request.jwt.claim.sub='91000000-0000-0000-0000-000000000004';
set role authenticated;
do $$ begin
  perform public.submit_activity(
    '72000000-0000-0000-0000-000000000002',
    (select payload from route_answers where label='starting'),
    0
  );
  perform public.submit_activity(
    '72000000-0000-0000-0000-000000000003',
    (select payload from route_answers where label='progress'),
    0
  );
end $$;
reset role;

do $$
begin
  if (select route from public.learner_routes where learner_id='91000000-0000-0000-0000-000000000001' and status='active')<>'Full Path' then raise exception 'Full Path route failed'; end if;
  if (select route from public.learner_routes where learner_id='91000000-0000-0000-0000-000000000002' and status='active')<>'Reduced Practice' then raise exception 'Reduced Practice route failed'; end if;
  if (select route from public.learner_routes where learner_id='91000000-0000-0000-0000-000000000003' and status='active')<>'Mastery Check Only' then raise exception 'Mastery Check Only route failed'; end if;
  if (select route from public.learner_routes where learner_id='91000000-0000-0000-0000-000000000004' and status='active')<>'Fast-Tracked' then raise exception 'Fast-Tracked route failed'; end if;
  if not exists(select 1 from public.topic_skip_evidence
      where learner_id='91000000-0000-0000-0000-000000000004'
        and demonstrations_count>=2 and retention_scheduled and not compulsory) then
    raise exception 'fast-track safeguards/evidence failed';
  end if;
end $$;
