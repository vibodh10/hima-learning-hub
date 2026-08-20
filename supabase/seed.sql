-- Fictional curriculum, class and local-development identity seed.
insert into public.organisations (id,name) values ('10000000-0000-0000-0000-000000000001','Northbridge College');
insert into public.academic_years (id,organisation_id,name,starts_on,ends_on)
values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','2026/27','2026-09-01','2027-07-31');
insert into public.courses (id,organisation_id,title,qualification) values
('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Pearson BTEC National Computing','Level 3');
insert into public.units (id,course_id,code,title,sort_order) values
('40000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001','2','Fundamentals of Computer Systems',1),
('40000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000001','4','Software Design and Development Project',2),
('40000000-0000-0000-0000-000000000006','30000000-0000-0000-0000-000000000001','6','IT Systems Security',3),
('40000000-0000-0000-0000-000000000008','30000000-0000-0000-0000-000000000001','8','Business Applications of Social Media',4),
('40000000-0000-0000-0000-000000000009','30000000-0000-0000-0000-000000000001','9','The Impact of Computing',5);
insert into public.topics (id,unit_id,title,sort_order)
values ('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000006','Network security fundamentals',1);
insert into public.lessons (id,topic_id,week_number,title,remember,learn,worked_example,reflection_prompt)
values ('60000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001',1,'Protecting a college network',
'Recall the purpose of confidentiality, integrity and availability.',
'A firewall applies rules to network traffic. It can allow expected traffic and block traffic that does not meet policy. Defence in depth combines controls so that one failure does not expose the whole system.',
'A college separates guest Wi-Fi from its staff network. Step 1: identify assets and users. Step 2: place the guest service in a separate network segment. Step 3: apply a deny-by-default firewall rule. Step 4: permit only the internet services guests need. Step 5: review logs and test the rule.',
'How confident are you that you could explain defence in depth to another learner?');
insert into public.activities (id,lesson_id,title,kind,pathway,estimated_minutes,max_attempts)
values ('70000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','Network security check','in_class_practice','Core',10,3);
insert into public.questions (id,course_id,unit_id,topic_id,difficulty,kind,question_text,correct_answer,acceptable_answers,explanation,marks,tags,numeric_tolerance) values
('80000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000006','50000000-0000-0000-0000-000000000001','Core','single_choice','Which control filters network traffic using rules?','"Firewall"','[]','A firewall permits or blocks traffic according to configured rules.',1,'{firewall}',null),
('80000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000006','50000000-0000-0000-0000-000000000001','Core','true_false','Network segmentation can limit the spread of an attack.','true','[]','Segmentation creates boundaries between parts of a network.',1,'{segmentation}',null),
('80000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000006','50000000-0000-0000-0000-000000000001','Support','fill_blank','Complete the phrase: defence in ___.','"depth"','["layers"]','Defence in depth uses multiple layers of control.',1,'{defence-in-depth}',null),
('80000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000006','50000000-0000-0000-0000-000000000001','Stretch','multiple_response','Select two sensible controls for guest Wi-Fi.','["Separate network segment","Firewall rules"]','[]','Segmentation and firewall rules reduce access to protected systems.',2,'{guest-wifi}',null),
('80000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000006','50000000-0000-0000-0000-000000000001','Core','numeric','A learner answers 4 of 5 one-mark questions correctly. What percentage is this?','80','[]','Four divided by five, multiplied by 100, is 80%.',1,'{calculation}',0);
insert into public.question_options(question_id,option_text,sort_order) values
('80000000-0000-0000-0000-000000000001','Firewall',1),('80000000-0000-0000-0000-000000000001','Monitor',2),('80000000-0000-0000-0000-000000000001','Printer',3),
('80000000-0000-0000-0000-000000000004','Separate network segment',1),('80000000-0000-0000-0000-000000000004','Firewall rules',2),('80000000-0000-0000-0000-000000000004','Shared administrator password',3);
insert into public.activity_questions(activity_id,question_id,sort_order)
select '70000000-0000-0000-0000-000000000001',id,row_number() over(order by id) from public.questions;

-- Fictional local-development identities. Never reuse these credentials outside
-- a disposable local Supabase stack.
insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
('00000000-0000-0000-0000-000000000000','90000000-0000-0000-0000-000000000001','authenticated','authenticated',
 'teacher@northbridge.example',extensions.crypt('LocalTeacher!26',extensions.gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}','{"display_name":"Hima"}',now(),now()),
('00000000-0000-0000-0000-000000000000','90000000-0000-0000-0000-000000000002','authenticated','authenticated',
 'learner@northbridge.example',extensions.crypt('LocalLearner!26',extensions.gen_salt('bf')),now(),
 '{"provider":"email","providers":["email"]}','{"display_name":"Sam Taylor"}',now(),now());
insert into auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
select id,id,jsonb_build_object('sub',id::text,'email',email),'email',now(),now(),now()
from auth.users where id in ('90000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000002');
insert into public.user_profiles(id,organisation_id,role,display_name) values
('90000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','teacher','Hima'),
('90000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','student','Sam Taylor');
insert into public.classes(id,organisation_id,academic_year_id,course_id,teacher_id,name,enrolment_code_hash,enrolment_code_hint)
values('a0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',
 '20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',
 '90000000-0000-0000-0000-000000000001','L3 Computing A',extensions.crypt('HIMA-2026',extensions.gen_salt('bf')),'26');
insert into public.enrolments(class_id,student_id)
values('a0000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000002');
