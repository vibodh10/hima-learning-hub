-- Safe hosted seed: fictional curriculum only. No Auth users, passwords, class,
-- enrolments, learner attempts, or personal data.
insert into public.organisations (id,name) values
('10000000-0000-0000-0000-000000000001','Northbridge College')
on conflict (id) do nothing;
insert into public.academic_years (id,organisation_id,name,starts_on,ends_on) values
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','2026/27','2026-09-01','2027-07-31')
on conflict (id) do nothing;
insert into public.courses (id,organisation_id,title,qualification) values
('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Pearson BTEC Level 3 National Information Technology','Level 3')
on conflict (id) do update set title=excluded.title,qualification=excluded.qualification;
insert into public.units (id,course_id,code,title,sort_order) values
('40000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001','2','Creating Systems to Manage Information',1),
('40000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000001','4','Programming',2),
('40000000-0000-0000-0000-000000000006','30000000-0000-0000-0000-000000000001','6','Website Development',3),
('40000000-0000-0000-0000-000000000008','30000000-0000-0000-0000-000000000001','8','Computer Games Development',4),
('40000000-0000-0000-0000-000000000009','30000000-0000-0000-0000-000000000001','9','IT Project Management',5)
on conflict (id) do update set title=excluded.title,sort_order=excluded.sort_order;
insert into public.topics (id,unit_id,title,sort_order) values
('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000006','Network security fundamentals',1)
on conflict (id) do nothing;
insert into public.lessons (id,topic_id,week_number,title,remember,learn,worked_example,reflection_prompt) values
('60000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001',1,'Protecting a college network',
'Recall the purpose of confidentiality, integrity and availability.',
'A firewall applies rules to network traffic. It can allow expected traffic and block traffic that does not meet policy. Defence in depth combines controls so that one failure does not expose the whole system.',
'A college separates guest Wi-Fi from its staff network. Step 1: identify assets and users. Step 2: place the guest service in a separate network segment. Step 3: apply a deny-by-default firewall rule. Step 4: permit only the internet services guests need. Step 5: review logs and test the rule.',
'How confident are you that you could explain defence in depth to another learner?')
on conflict (id) do nothing;
insert into public.activities (id,lesson_id,title,kind,pathway,estimated_minutes,max_attempts) values
('70000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','Network security check','in_class_practice','Core',10,3)
on conflict (id) do nothing;
insert into public.questions
(id,course_id,unit_id,topic_id,difficulty,kind,question_text,correct_answer,acceptable_answers,explanation,marks,tags,numeric_tolerance)
values
('80000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000006','50000000-0000-0000-0000-000000000001','Core','single_choice','Which control filters network traffic using rules?','"Firewall"','[]','A firewall permits or blocks traffic according to configured rules.',1,'{firewall}',null),
('80000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000006','50000000-0000-0000-0000-000000000001','Core','true_false','Network segmentation can limit the spread of an attack.','true','[]','Segmentation creates boundaries between parts of a network.',1,'{segmentation}',null),
('80000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000006','50000000-0000-0000-0000-000000000001','Support','fill_blank','Complete the phrase: defence in ___.','"depth"','["layers"]','Defence in depth uses multiple layers of control.',1,'{defence-in-depth}',null),
('80000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000006','50000000-0000-0000-0000-000000000001','Stretch','multiple_response','Select two sensible controls for guest Wi-Fi.','["Separate network segment","Firewall rules"]','[]','Segmentation and firewall rules reduce access to protected systems.',2,'{guest-wifi}',null),
('80000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000006','50000000-0000-0000-0000-000000000001','Core','numeric','A learner answers 4 of 5 one-mark questions correctly. What percentage is this?','80','[]','Four divided by five, multiplied by 100, is 80%.',1,'{calculation}',0)
on conflict (id) do nothing;
insert into public.question_options(question_id,option_text,sort_order) values
('80000000-0000-0000-0000-000000000001','Firewall',1),
('80000000-0000-0000-0000-000000000001','Monitor',2),
('80000000-0000-0000-0000-000000000001','Printer',3),
('80000000-0000-0000-0000-000000000004','Separate network segment',1),
('80000000-0000-0000-0000-000000000004','Firewall rules',2),
('80000000-0000-0000-0000-000000000004','Shared administrator password',3)
on conflict (question_id,sort_order) do nothing;
insert into public.activity_questions(activity_id,question_id,sort_order)
select '70000000-0000-0000-0000-000000000001',id,row_number() over(order by id)
from public.questions where id::text like '80000000-0000-0000-0000-00000000000%'
on conflict (activity_id,question_id) do nothing;
