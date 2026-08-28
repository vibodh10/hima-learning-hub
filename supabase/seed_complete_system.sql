-- Idempotent curriculum catalogue and editable example-class seed.

update public.courses set
  title='Pearson BTEC Level 3 National Information Technology',
  qualification='Pearson BTEC Level 3 National Information Technology',
  qualification_type='BTEC National',
  qualification_level='Level 3',
  awarding_organisation='Pearson',
  qualification_number='601/7575/8',
  teacher_notes='Complete catalogue; initial teaching units are suggestions only.',
  active=true,published=true
where id='30000000-0000-0000-0000-000000000001';

update public.courses set
  title='T Level Digital Software Development',
  qualification='T Level Digital',
  qualification_type='T Level',
  qualification_level='Level 3',
  awarding_organisation='Institute for Apprenticeships and Technical Education',
  teacher_notes='Core content areas plus the Digital Software Development occupational specialism.',
  active=true,published=true
where id='30000000-0000-0000-0000-000000000002';

insert into public.curriculum_versions(
  id,course_id,version_label,specification_year,source_reference,teacher_notes,active
) values
('31000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',
 'Current specification',2026,'Pearson BTEC Level 3 National Information Technology',
 'Historical versions must be archived rather than overwritten.',true),
('31000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002',
 'Current specification',2026,'T Level Technical Qualification in Digital',
 'Architecture supports additional occupational specialisms and future versions.',true)
on conflict(course_id,version_label) do update set
  specification_year=excluded.specification_year,
  source_reference=excluded.source_reference,
  teacher_notes=excluded.teacher_notes,active=true,archived_at=null;

-- Preserve existing T Level primary keys while correcting earlier draft slugs.
update public.units set code='introduction-to-programming'
where id='42000000-0000-0000-0000-000000000002';
update public.units set code='digital-software-development'
where id='42000000-0000-0000-0000-000000000009';

insert into public.units(
  id,course_id,curriculum_version_id,code,title,sort_order,status,kind,
  initial_teaching,description
) values
('43000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','1','Information Technology Systems',1,'approved','unit',false,'Complete catalogue entry.'),
('40000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','2','Creating Systems to Manage Information',2,'approved','unit',true,'Likely initial teaching unit.'),
('43000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','3','Using Social Media in Business',3,'approved','unit',false,'Complete catalogue entry.'),
('40000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','4','Programming',4,'approved','unit',true,'Likely initial teaching unit and Python pilot.'),
('43000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','5','Data Modelling',5,'approved','unit',false,'Complete catalogue entry.'),
('40000000-0000-0000-0000-000000000006','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','6','Website Development',6,'approved','unit',true,'Likely initial teaching unit.'),
('43000000-0000-0000-0000-000000000007','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','7','Mobile Apps Development',7,'approved','unit',false,'Complete catalogue entry.'),
('40000000-0000-0000-0000-000000000008','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','8','Computer Games Development',8,'approved','unit',true,'Likely initial teaching unit.'),
('40000000-0000-0000-0000-000000000009','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','9','IT Project Management',9,'approved','unit',true,'Likely initial teaching unit.'),
('43000000-0000-0000-0000-000000000010','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','10','Big Data and Business Analytics',10,'approved','unit',false,'Complete catalogue entry.'),
('43000000-0000-0000-0000-000000000011','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','11','Cyber Security and Incident Management',11,'approved','unit',false,'Complete catalogue entry.'),
('43000000-0000-0000-0000-000000000012','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','12','IT Technical Support and Management',12,'approved','unit',false,'Complete catalogue entry.'),
('43000000-0000-0000-0000-000000000013','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','13','Software Testing',13,'approved','unit',false,'Complete catalogue entry.'),
('43000000-0000-0000-0000-000000000014','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','14','IT Service Delivery',14,'approved','unit',false,'Complete catalogue entry.'),
('43000000-0000-0000-0000-000000000015','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','15','Customising and Integrating Applications',15,'approved','unit',false,'Complete catalogue entry.'),
('43000000-0000-0000-0000-000000000016','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','16','Cloud Storage and Collaboration Tools',16,'approved','unit',false,'Complete catalogue entry.'),
('43000000-0000-0000-0000-000000000017','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','17','2D and 3D Digital Graphics',17,'approved','unit',false,'Complete catalogue entry.'),
('43000000-0000-0000-0000-000000000018','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','18','Digital Animation and Effects',18,'approved','unit',false,'Complete catalogue entry.'),
('43000000-0000-0000-0000-000000000019','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','19','The Internet of Things',19,'approved','unit',false,'Complete catalogue entry.'),
('43000000-0000-0000-0000-000000000020','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','20','Enterprise in IT',20,'approved','unit',false,'Complete catalogue entry.'),
('43000000-0000-0000-0000-000000000021','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','21','Business Process Modelling Tools',21,'approved','unit',false,'Complete catalogue entry.')
on conflict(course_id,code) do update set
  curriculum_version_id=excluded.curriculum_version_id,title=excluded.title,
  sort_order=excluded.sort_order,status=excluded.status,kind=excluded.kind,
  initial_teaching=excluded.initial_teaching,description=excluded.description;

insert into public.units(
  id,course_id,curriculum_version_id,code,title,sort_order,status,kind,description
) values
('42000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002','31000000-0000-0000-0000-000000000002','problem-solving','Problem Solving',1,'approved','content_area','T Level core content area.'),
('42000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','31000000-0000-0000-0000-000000000002','introduction-to-programming','Introduction to Programming',2,'approved','content_area','T Level core content area.'),
('42000000-0000-0000-0000-000000000008','30000000-0000-0000-0000-000000000002','31000000-0000-0000-0000-000000000002','emerging-issues','Emerging Issues and the Impact of Digital',3,'approved','content_area','T Level core content area.'),
('42000000-0000-0000-0000-000000000006','30000000-0000-0000-0000-000000000002','31000000-0000-0000-0000-000000000002','legislation','Legislation and Regulatory Requirements',4,'approved','content_area','T Level core content area.'),
('42000000-0000-0000-0000-000000000007','30000000-0000-0000-0000-000000000002','31000000-0000-0000-0000-000000000002','business-context','Business Context',5,'approved','content_area','T Level core content area.'),
('42000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000002','31000000-0000-0000-0000-000000000002','data','Data',6,'approved','content_area','T Level core content area.'),
('42000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000002','31000000-0000-0000-0000-000000000002','digital-environments','Digital Environments',7,'approved','content_area','T Level core content area.'),
('42000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000002','31000000-0000-0000-0000-000000000002','security','Security',8,'approved','content_area','T Level core content area.'),
('42000000-0000-0000-0000-000000000009','30000000-0000-0000-0000-000000000002','31000000-0000-0000-0000-000000000002','digital-software-development','Digital Software Development',9,'approved','occupational_specialism','Occupational specialism with extensible performance areas.')
on conflict(course_id,code) do update set
  curriculum_version_id=excluded.curriculum_version_id,title=excluded.title,
  sort_order=excluded.sort_order,status=excluded.status,kind=excluded.kind,
  description=excluded.description;

insert into public.learning_aims(unit_id,code,title,description,sort_order,status)
select '42000000-0000-0000-0000-000000000009',v.code,v.title,
  'Digital Software Development performance area.',v.ord,'draft'
from (values
 ('PA01','Analysing problems',1),('PA02','Identifying user needs',2),
 ('PA03','Defining requirements',3),('PA04','Defining acceptance criteria',4),
 ('PA05','Designing software',5),('PA06','Implementing software',6),
 ('PA07','Testing software',7),('PA08','Maintaining software',8),
 ('PA09','Supporting software',9),('PA10','Working collaboratively',10),
 ('PA11','Evaluating reliable technical information',11),
 ('PA12','Applying ethical principles',12),
 ('PA13','Applying legal and regulatory requirements',13),
 ('PA14','Managing technical and project risks',14)
) as v(code,title,ord)
on conflict(unit_id,code) do update set
  title=excluded.title,description=excluded.description,sort_order=excluded.sort_order;

insert into public.assessment_blueprints(
  id,curriculum_version_id,unit_id,title,scope,status
) values(
  'b1000000-0000-0000-0000-000000000010',
  '31000000-0000-0000-0000-000000000001',null,
  'BTEC course starting point','course_starting_point','approved'
) on conflict(id) do update set title=excluded.title,scope=excluded.scope,status='approved';

insert into public.learning_aims(
  id,unit_id,code,title,description,sort_order,status
) values(
  '44000000-0000-0000-0000-000000000001',
  '43000000-0000-0000-0000-000000000001','SP',
  'Course starting point','Broad prior-knowledge and learning-profile evidence.',0,'approved'
) on conflict(unit_id,code) do update set
  title=excluded.title,description=excluded.description,status='approved';

insert into public.topics(
  id,unit_id,learning_aim_id,title,description,sort_order,status
) values(
  '54000000-0000-0000-0000-000000000001',
  '43000000-0000-0000-0000-000000000001',
  '44000000-0000-0000-0000-000000000001',
  'Course starting point',
  'A broad diagnostic of prior digital knowledge, experience and study approach.',0,'approved'
) on conflict(id) do update set
  unit_id=excluded.unit_id,learning_aim_id=excluded.learning_aim_id,
  title=excluded.title,description=excluded.description,status='approved';

insert into public.skills(id,topic_id,code,title,description,sort_order,status) values
('55000000-0000-0000-0000-000000000001','54000000-0000-0000-0000-000000000001','digital-knowledge','Broad digital knowledge','Recognise common digital systems, data and security concepts.',1,'approved'),
('55000000-0000-0000-0000-000000000002','54000000-0000-0000-0000-000000000001','problem-solving','Problem solving','Break a problem into ordered, testable steps.',2,'approved'),
('55000000-0000-0000-0000-000000000003','54000000-0000-0000-0000-000000000001','programming-experience','Programming experience','Interpret basic variables, input, processing and output.',3,'approved'),
('55000000-0000-0000-0000-000000000004','54000000-0000-0000-0000-000000000001','database-experience','Database experience','Recognise tables, records, fields and keys.',4,'approved'),
('55000000-0000-0000-0000-000000000005','54000000-0000-0000-0000-000000000001','web-experience','Web-development experience','Recognise the roles of HTML, CSS and accessible navigation.',5,'approved'),
('55000000-0000-0000-0000-000000000006','54000000-0000-0000-0000-000000000001','game-experience','Game-development experience','Recognise game states, mechanics and testing.',6,'approved'),
('55000000-0000-0000-0000-000000000007','54000000-0000-0000-0000-000000000001','project-experience','Project-working experience','Sequence work, identify risks and communicate progress.',7,'approved'),
('55000000-0000-0000-0000-000000000008','54000000-0000-0000-0000-000000000001','study-habits','Study habits','Choose a sustainable retrieval and practice strategy.',8,'approved')
on conflict(topic_id,code) do update set
  title=excluded.title,description=excluded.description,sort_order=excluded.sort_order,status='approved';

insert into public.lessons(
  id,topic_id,learning_aim_id,week_number,title,remember,learn,worked_example,
  reflection_prompt,status,language,objectives,estimated_minutes
) values(
  '65000000-0000-0000-0000-000000000010',
  '54000000-0000-0000-0000-000000000001',
  '44000000-0000-0000-0000-000000000001',1,
  'Course starting point','This is a baseline, not a grade or ability label.',
  'Answer independently so your teacher can allocate appropriate learning and support.',
  'Read each scenario, select the most reasonable answer, and record confidence honestly.',
  'Which prior experience or learning support should your teacher know about?',
  'approved','Digital','["Record broad prior knowledge","Identify starting strengths and gaps","Capture confidence and support needs"]',20
) on conflict(id) do update set title=excluded.title,learn=excluded.learn,status='approved';

insert into public.questions(
  id,course_id,unit_id,learning_aim_id,topic_id,skill_id,
  curriculum_version_id,blueprint_id,blueprint_category,difficulty,pathway,kind,
  question_text,correct_answer,acceptable_answers,feedback_correct,
  feedback_incorrect,explanation,hint,marks,tags,estimated_seconds,status
) values
('83000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','43000000-0000-0000-0000-000000000001','44000000-0000-0000-0000-000000000001','54000000-0000-0000-0000-000000000001','55000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000010','broad digital knowledge','Core','Core','single_choice','Which statement best describes two-factor authentication?','"It requires two different forms of evidence"','[]','Correct.','Look for two independent forms of evidence.','Two-factor authentication combines different evidence categories rather than asking for the same password twice.',null,1,'{starting-point,digital}',45,'approved'),
('83000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001','43000000-0000-0000-0000-000000000001','44000000-0000-0000-0000-000000000001','54000000-0000-0000-0000-000000000001','55000000-0000-0000-0000-000000000002','31000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000010','problem solving','Core','Core','scenario_decision','A device will not connect. Write the four investigation stages in a sensible order.','"Define the problem, gather evidence, test one cause, review the result"','["define the problem; gather evidence; test one cause; review the result"]','Correct.','Start by defining the problem and finish by reviewing evidence.','A controlled investigation defines, gathers, tests and reviews.',null,1,'{starting-point,problem-solving}',60,'approved'),
('83000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000001','43000000-0000-0000-0000-000000000001','44000000-0000-0000-0000-000000000001','54000000-0000-0000-0000-000000000001','55000000-0000-0000-0000-000000000003','31000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000010','programming experience','Core','Core','code_output',E'count = 3\ncount = count + 2\nprint(count)','"5"','[]','Correct.','Trace the updated value.','The second statement changes count from 3 to 5.',null,1,'{starting-point,programming}',45,'approved'),
('83000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000001','43000000-0000-0000-0000-000000000001','44000000-0000-0000-0000-000000000001','54000000-0000-0000-0000-000000000001','55000000-0000-0000-0000-000000000004','31000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000010','database experience','Core','Core','single_choice','Which database feature uniquely identifies each record in a table?','"Primary key"','[]','Correct.','Choose the field that must be unique for every record.','A primary key provides a unique identifier for each record.',null,1,'{starting-point,database}',40,'approved'),
('83000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000001','43000000-0000-0000-0000-000000000001','44000000-0000-0000-0000-000000000001','54000000-0000-0000-0000-000000000001','55000000-0000-0000-0000-000000000005','31000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000010','web experience','Core','Core','single_choice','Which technology gives a web page its semantic structure?','"HTML"','[]','Correct.','Separate structure from presentation.','HTML describes document structure; CSS controls presentation.',null,1,'{starting-point,web}',40,'approved'),
('83000000-0000-0000-0000-000000000006','30000000-0000-0000-0000-000000000001','43000000-0000-0000-0000-000000000001','44000000-0000-0000-0000-000000000001','54000000-0000-0000-0000-000000000001','55000000-0000-0000-0000-000000000006','31000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000010','game experience','Core','Core','scenario_decision','A player reaches zero lives. Which concept should control the move to a game-over screen?','"Game state"','["state"]','Correct.','Think about the mode the game is currently in.','A game state controls transitions such as playing, paused and game over.',null,1,'{starting-point,games}',45,'approved'),
('83000000-0000-0000-0000-000000000007','30000000-0000-0000-0000-000000000001','43000000-0000-0000-0000-000000000001','44000000-0000-0000-0000-000000000001','54000000-0000-0000-0000-000000000001','55000000-0000-0000-0000-000000000007','31000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000010','project experience','Core','Core','single_choice','Which item records something uncertain that could affect a project later?','"Risk"','[]','Correct.','Distinguish a possible future event from a current problem.','A risk is uncertain; an issue has already happened.',null,1,'{starting-point,project}',40,'approved'),
('83000000-0000-0000-0000-000000000008','30000000-0000-0000-0000-000000000001','43000000-0000-0000-0000-000000000001','44000000-0000-0000-0000-000000000001','54000000-0000-0000-0000-000000000001','55000000-0000-0000-0000-000000000008','31000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000010','study habits','Core','Core','single_choice','Which plan is most likely to support long-term retention?','"Three short spaced practice sessions with a later review"','[]','Correct.','Look for spaced rather than excessive practice.','Short planned sessions plus delayed retrieval support retention.',null,1,'{starting-point,study}',40,'approved')
on conflict(id) do update set
  question_text=excluded.question_text,correct_answer=excluded.correct_answer,
  explanation=excluded.explanation,status='approved',blueprint_id=excluded.blueprint_id;

insert into public.question_options(question_id,option_text,sort_order) values
('83000000-0000-0000-0000-000000000001','It requires two different forms of evidence',1),
('83000000-0000-0000-0000-000000000001','It asks for the same password twice',2),
('83000000-0000-0000-0000-000000000004','Primary key',1),
('83000000-0000-0000-0000-000000000004','Report',2),
('83000000-0000-0000-0000-000000000005','HTML',1),
('83000000-0000-0000-0000-000000000005','CSS',2),
('83000000-0000-0000-0000-000000000007','Risk',1),
('83000000-0000-0000-0000-000000000007','Issue',2),
('83000000-0000-0000-0000-000000000008','Three short spaced practice sessions with a later review',1),
('83000000-0000-0000-0000-000000000008','One very long session with no later review',2)
on conflict(question_id,sort_order) do update set option_text=excluded.option_text;

insert into public.academic_periods(
  id,academic_year_id,name,kind,starts_on,ends_on
) values
('21000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Autumn','term','2026-09-01','2026-12-18'),
('21000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','Spring','term','2027-01-04','2027-03-26'),
('21000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','Summer','term','2027-04-12','2027-07-31')
on conflict(academic_year_id,name) do update set
  kind=excluded.kind,starts_on=excluded.starts_on,ends_on=excluded.ends_on,archived_at=null;

insert into public.assessment_blueprints(
  id,curriculum_version_id,unit_id,title,scope,status
) values
('b1000000-0000-0000-0000-000000000010','31000000-0000-0000-0000-000000000001',null,
 'BTEC course starting point','course_starting_point','approved'),
('b1000000-0000-0000-0000-000000000011','31000000-0000-0000-0000-000000000001',
 '40000000-0000-0000-0000-000000000004',
 'Unit 4 Python starting point','unit_starting_point','approved'),
('b1000000-0000-0000-0000-000000000012','31000000-0000-0000-0000-000000000001',
 '40000000-0000-0000-0000-000000000004',
 'Unit 4 Python equivalent progress point','progress_point','approved'),
('b1000000-0000-0000-0000-000000000013','31000000-0000-0000-0000-000000000001',
 '40000000-0000-0000-0000-000000000004',
 'Unit 4 Python delayed retention check','retention_check','approved')
on conflict(id) do update set title=excluded.title,scope=excluded.scope,status='approved';

insert into public.activities(
  id,lesson_id,title,kind,pathway,learning_stage,status,estimated_minutes,max_attempts,
  required,automatic_marking,instructions,assessment_kind,blueprint_id
) values
('72000000-0000-0000-0000-000000000001','65000000-0000-0000-0000-000000000010',
 'Course starting point: digital knowledge and experience','review_check','Core',
 'mastery_check','approved',20,1,true,true,
 'Complete independently. This permanent baseline records confidence and prior experience.',
 'course_starting_point','b1000000-0000-0000-0000-000000000010'),
('72000000-0000-0000-0000-000000000002','61000000-0000-0000-0000-000000000001',
 'Unit 4 starting point: Python foundations','review_check','Core',
 'mastery_check','approved',12,1,true,true,
 'Complete independently before the topic. The original result is never overwritten.',
 'unit_starting_point','b1000000-0000-0000-0000-000000000011'),
('72000000-0000-0000-0000-000000000003','61000000-0000-0000-0000-000000000001',
 'Progress point: equivalent Python foundations','review_check','Core',
 'mastery_check','approved',12,3,true,true,
 'Equivalent questions measure the same skills without repeating the starting-point wording.',
 'progress_point','b1000000-0000-0000-0000-000000000012'),
('72000000-0000-0000-0000-000000000004','61000000-0000-0000-0000-000000000001',
 'Delayed retention check: Python foundations','review_check','Core',
 'retrieval_review','approved',10,3,true,true,
 'Complete after the scheduled delay to demonstrate retained learning.',
 'retention_check','b1000000-0000-0000-0000-000000000013')
on conflict(id) do update set
  lesson_id=excluded.lesson_id,title=excluded.title,instructions=excluded.instructions,
  assessment_kind=excluded.assessment_kind,blueprint_id=excluded.blueprint_id,status='approved';

delete from public.activity_questions
where activity_id='72000000-0000-0000-0000-000000000001';
insert into public.activity_questions(activity_id,question_id,sort_order)
select '72000000-0000-0000-0000-000000000001',id,
  row_number() over(order by id)
from public.questions
where id between '83000000-0000-0000-0000-000000000001'
  and '83000000-0000-0000-0000-000000000008'
on conflict(activity_id,question_id) do nothing;
insert into public.activity_questions(activity_id,question_id,sort_order)
select '72000000-0000-0000-0000-000000000002',id,
  row_number() over(order by id)
from public.questions
where id between '81000000-0000-0000-0000-000000000025'
  and '81000000-0000-0000-0000-000000000029'
on conflict(activity_id,question_id) do nothing;
insert into public.activity_questions(activity_id,question_id,sort_order)
select '72000000-0000-0000-0000-000000000003',id,
  row_number() over(order by id)
from public.questions
where id between '81000000-0000-0000-0000-000000000030'
  and '81000000-0000-0000-0000-000000000034'
on conflict(activity_id,question_id) do nothing;
insert into public.activity_questions(activity_id,question_id,sort_order)
select '72000000-0000-0000-0000-000000000004',id,
  row_number() over(order by id)
from public.questions
where id between '81000000-0000-0000-0000-000000000030'
  and '81000000-0000-0000-0000-000000000034'
on conflict(activity_id,question_id) do nothing;

update public.questions set
  curriculum_version_id='31000000-0000-0000-0000-000000000001',
  blueprint_id=case
    when id between '81000000-0000-0000-0000-000000000025'
      and '81000000-0000-0000-0000-000000000029'
      then 'b1000000-0000-0000-0000-000000000011'::uuid
    when id between '81000000-0000-0000-0000-000000000030'
      and '81000000-0000-0000-0000-000000000034'
      then 'b1000000-0000-0000-0000-000000000012'::uuid
    else blueprint_id end,
  blueprint_category=coalesce(blueprint_category,'Python foundations')
where course_id='30000000-0000-0000-0000-000000000001';

-- Five editable starter groups. Existing fictional teacher is used when present;
-- hosted projects use the first active teacher/administrator in the organisation.
insert into public.classes(
  organisation_id,academic_year_id,academic_period_id,course_id,teacher_id,name,
  enrolment_code_hash,enrolment_code_hint,starts_on,ends_on,weekly_learning_day,published
)
select
  p.organisation_id,'20000000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',p.id,'Group '||g.n,
  extensions.crypt('GROUP-'||g.n||'-2026',extensions.gen_salt('bf')),
  right(g.n::text||'26',2),'2026-09-01','2027-07-31',2,false
from public.user_profiles p cross join generate_series(1,5) g(n)
where p.organisation_id='10000000-0000-0000-0000-000000000001'
  and p.role in ('teacher','administrator') and p.archived_at is null
  and not exists(select 1 from public.classes c
    where c.organisation_id=p.organisation_id and c.name='Group '||g.n and c.archived_at is null)
  and p.id=(select p2.id from public.user_profiles p2
    where p2.organisation_id=p.organisation_id
      and p2.role in ('teacher','administrator') and p2.archived_at is null
    order by case p2.role when 'teacher' then 1 else 2 end,p2.created_at limit 1);

insert into public.class_teachers(class_id,teacher_id,is_lead)
select c.id,c.teacher_id,true from public.classes c
where c.organisation_id='10000000-0000-0000-0000-000000000001'
on conflict(class_id,teacher_id) do update set is_lead=true,archived_at=null;

insert into public.class_units(class_id,unit_id,active,selected_by)
select c.id,u.id,true,c.teacher_id
from public.classes c join public.units u on u.course_id=c.course_id
where c.organisation_id='10000000-0000-0000-0000-000000000001'
  and (u.initial_teaching or (u.course_id='30000000-0000-0000-0000-000000000001' and u.code='1'))
  and u.archived_at is null
on conflict(class_id,unit_id) do update set active=true,archived_at=null;

update public.classes c set active_unit_id='40000000-0000-0000-0000-000000000004'
where c.course_id='30000000-0000-0000-0000-000000000001'
  and c.active_unit_id is null;

update public.classes set published=true
where id='a0000000-0000-0000-0000-000000000001';

-- Shared 12-teaching-week journeys for the initial SCCB units. These contain
-- sequence/milestone structure only; Pearson aims and criteria remain linked
-- to the separately versioned curriculum records and are never invented here.
insert into public.learning_journey_templates(
  unit_id,title,total_teaching_weeks,status,source_reference,approved_at
)
select unit.id,unit.title||' — 12 teaching weeks',12,'approved',
  version.source_reference,now()
from public.units unit
join public.courses course on course.id=unit.course_id
left join public.curriculum_versions version
  on version.id=unit.curriculum_version_id and version.active and version.archived_at is null
where unit.code in ('2','4','6','10','14') and unit.archived_at is null
  and (lower(coalesce(course.awarding_organisation,'')) like '%pearson%'
    or lower(course.title) like '%btec%')
on conflict(unit_id,version_number) do nothing;

insert into public.learning_journey_weeks(template_id,teaching_week,title,milestone)
select template.id,week_number,'Teaching Week '||week_number,
  case week_number when 1 then 'starting_point'
    when 6 then 'progress_check_1'
    when 10 then 'progress_check_2'
    when 12 then 'final' else 'learning' end
from public.learning_journey_templates template
cross join generate_series(1,12) week_number
where template.status='approved' and template.archived_at is null
on conflict(template_id,teaching_week) do nothing;

select public.seed_initial_learning_journey_weeks();

insert into public.learning_journey_week_lessons(journey_week_id,lesson_id,sequence)
select journey_week.id,lesson.id,
  row_number() over(partition by journey_week.id order by topic.sort_order,lesson.title)::integer
from public.learning_journey_weeks journey_week
join public.learning_journey_templates template on template.id=journey_week.template_id
join public.topics topic on topic.unit_id=template.unit_id and topic.archived_at is null
join public.lessons lesson on lesson.topic_id=topic.id
  and lesson.week_number=journey_week.teaching_week and lesson.archived_at is null
on conflict(journey_week_id,lesson_id) do nothing;

insert into public.catch_up_policies(organisation_id)
select id from public.organisations on conflict(organisation_id) do nothing;

select public.seed_achievement_configuration();

-- An equivalent, course-specific starting point for T Level learners. Keeping
-- this separate from the BTEC baseline preserves the correct curriculum
-- version and prevents a learner from being directed into another course.
insert into public.assessment_blueprints(
  id,curriculum_version_id,unit_id,title,scope,status
) values(
  'b1000000-0000-0000-0000-000000000101',
  '31000000-0000-0000-0000-000000000002',null,
  'T Level course starting point','course_starting_point','approved'
) on conflict(id) do update set
  curriculum_version_id=excluded.curriculum_version_id,title=excluded.title,
  scope=excluded.scope,status='approved';

insert into public.learning_aims(
  id,unit_id,code,title,description,sort_order,status
) values(
  '44000000-0000-0000-0000-000000000101',
  '42000000-0000-0000-0000-000000000001','SP',
  'Course starting point',
  'Broad prior-knowledge, experience, confidence and learning-profile evidence.',
  0,'approved'
) on conflict(id) do update set
  unit_id=excluded.unit_id,title=excluded.title,description=excluded.description,
  status='approved';

insert into public.topics(
  id,unit_id,learning_aim_id,title,description,sort_order,status
) values(
  '54000000-0000-0000-0000-000000000101',
  '42000000-0000-0000-0000-000000000001',
  '44000000-0000-0000-0000-000000000101',
  'T Level course starting point',
  'A broad diagnostic of digital knowledge, problem solving and prior experience.',
  0,'approved'
) on conflict(id) do update set
  unit_id=excluded.unit_id,learning_aim_id=excluded.learning_aim_id,
  title=excluded.title,description=excluded.description,status='approved';

insert into public.skills(id,topic_id,code,title,description,sort_order,status) values
('55000000-0000-0000-0000-000000000101','54000000-0000-0000-0000-000000000101','digital-knowledge','Broad digital knowledge','Recognise common digital systems, data and security concepts.',1,'approved'),
('55000000-0000-0000-0000-000000000102','54000000-0000-0000-0000-000000000101','problem-solving','Problem solving','Break a problem into ordered, testable steps.',2,'approved'),
('55000000-0000-0000-0000-000000000103','54000000-0000-0000-0000-000000000101','programming-experience','Programming experience','Interpret basic variables, input, processing and output.',3,'approved'),
('55000000-0000-0000-0000-000000000104','54000000-0000-0000-0000-000000000101','database-experience','Database experience','Recognise tables, records, fields and keys.',4,'approved'),
('55000000-0000-0000-0000-000000000105','54000000-0000-0000-0000-000000000101','web-experience','Web-development experience','Recognise the roles of HTML, CSS and accessible navigation.',5,'approved'),
('55000000-0000-0000-0000-000000000106','54000000-0000-0000-0000-000000000101','software-experience','Software-development experience','Recognise software states, requirements and testing.',6,'approved'),
('55000000-0000-0000-0000-000000000107','54000000-0000-0000-0000-000000000101','project-experience','Project-working experience','Sequence work, identify risks and communicate progress.',7,'approved'),
('55000000-0000-0000-0000-000000000108','54000000-0000-0000-0000-000000000101','study-habits','Study habits','Choose a sustainable retrieval and practice strategy.',8,'approved')
on conflict(topic_id,code) do update set
  title=excluded.title,description=excluded.description,sort_order=excluded.sort_order,
  status='approved';

insert into public.lessons(
  id,topic_id,learning_aim_id,week_number,title,remember,learn,worked_example,
  reflection_prompt,status,language,objectives,estimated_minutes
) values(
  '65000000-0000-0000-0000-000000000101',
  '54000000-0000-0000-0000-000000000101',
  '44000000-0000-0000-0000-000000000101',1,
  'T Level course starting point',
  'This is a baseline, not a grade or ability label.',
  'Answer independently so your teacher can allocate appropriate learning and support.',
  'Read each scenario, select the most reasonable answer, and record confidence honestly.',
  'Which prior experience, aspiration or learning support should your teacher know about?',
  'approved','Digital',
  '["Record broad prior knowledge","Identify starting strengths and gaps","Capture confidence and support needs"]',
  20
) on conflict(id) do update set
  topic_id=excluded.topic_id,learning_aim_id=excluded.learning_aim_id,
  title=excluded.title,learn=excluded.learn,status='approved';

with question_map(source_id,target_id,target_skill) as (values
  ('83000000-0000-0000-0000-000000000001'::uuid,'83000000-0000-0000-0000-000000000101'::uuid,'55000000-0000-0000-0000-000000000101'::uuid),
  ('83000000-0000-0000-0000-000000000002'::uuid,'83000000-0000-0000-0000-000000000102'::uuid,'55000000-0000-0000-0000-000000000102'::uuid),
  ('83000000-0000-0000-0000-000000000003'::uuid,'83000000-0000-0000-0000-000000000103'::uuid,'55000000-0000-0000-0000-000000000103'::uuid),
  ('83000000-0000-0000-0000-000000000004'::uuid,'83000000-0000-0000-0000-000000000104'::uuid,'55000000-0000-0000-0000-000000000104'::uuid),
  ('83000000-0000-0000-0000-000000000005'::uuid,'83000000-0000-0000-0000-000000000105'::uuid,'55000000-0000-0000-0000-000000000105'::uuid),
  ('83000000-0000-0000-0000-000000000006'::uuid,'83000000-0000-0000-0000-000000000106'::uuid,'55000000-0000-0000-0000-000000000106'::uuid),
  ('83000000-0000-0000-0000-000000000007'::uuid,'83000000-0000-0000-0000-000000000107'::uuid,'55000000-0000-0000-0000-000000000107'::uuid),
  ('83000000-0000-0000-0000-000000000008'::uuid,'83000000-0000-0000-0000-000000000108'::uuid,'55000000-0000-0000-0000-000000000108'::uuid)
)
insert into public.questions(
  id,course_id,unit_id,learning_aim_id,topic_id,skill_id,
  curriculum_version_id,blueprint_id,blueprint_category,difficulty,pathway,kind,
  question_text,correct_answer,acceptable_answers,feedback_correct,
  feedback_incorrect,explanation,hint,marks,tags,estimated_seconds,status
)
select m.target_id,'30000000-0000-0000-0000-000000000002',
  '42000000-0000-0000-0000-000000000001',
  '44000000-0000-0000-0000-000000000101',
  '54000000-0000-0000-0000-000000000101',m.target_skill,
  '31000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000101',
  q.blueprint_category,q.difficulty,q.pathway,q.kind,q.question_text,
  q.correct_answer,q.acceptable_answers,q.feedback_correct,q.feedback_incorrect,
  q.explanation,q.hint,q.marks,q.tags,q.estimated_seconds,'approved'
from question_map m join public.questions q on q.id=m.source_id
on conflict(id) do update set
  course_id=excluded.course_id,unit_id=excluded.unit_id,
  learning_aim_id=excluded.learning_aim_id,topic_id=excluded.topic_id,
  skill_id=excluded.skill_id,curriculum_version_id=excluded.curriculum_version_id,
  blueprint_id=excluded.blueprint_id,question_text=excluded.question_text,
  correct_answer=excluded.correct_answer,explanation=excluded.explanation,status='approved';

with question_map(source_id,target_id) as (values
  ('83000000-0000-0000-0000-000000000001'::uuid,'83000000-0000-0000-0000-000000000101'::uuid),
  ('83000000-0000-0000-0000-000000000004'::uuid,'83000000-0000-0000-0000-000000000104'::uuid),
  ('83000000-0000-0000-0000-000000000005'::uuid,'83000000-0000-0000-0000-000000000105'::uuid),
  ('83000000-0000-0000-0000-000000000007'::uuid,'83000000-0000-0000-0000-000000000107'::uuid),
  ('83000000-0000-0000-0000-000000000008'::uuid,'83000000-0000-0000-0000-000000000108'::uuid)
)
insert into public.question_options(question_id,option_text,sort_order)
select m.target_id,o.option_text,o.sort_order
from question_map m join public.question_options o on o.question_id=m.source_id
on conflict(question_id,sort_order) do update set option_text=excluded.option_text;

insert into public.activities(
  id,lesson_id,title,kind,pathway,learning_stage,status,estimated_minutes,max_attempts,
  required,automatic_marking,instructions,assessment_kind,blueprint_id
) values(
  '72000000-0000-0000-0000-000000000101',
  '65000000-0000-0000-0000-000000000101',
  'T Level course starting point: digital knowledge and experience',
  'review_check','Core','mastery_check','approved',20,1,true,true,
  'Complete independently. This permanent baseline records confidence and prior experience.',
  'course_starting_point','b1000000-0000-0000-0000-000000000101'
) on conflict(id) do update set
  lesson_id=excluded.lesson_id,title=excluded.title,instructions=excluded.instructions,
  assessment_kind=excluded.assessment_kind,blueprint_id=excluded.blueprint_id,
  status='approved';

delete from public.activity_questions
where activity_id='72000000-0000-0000-0000-000000000101';
insert into public.activity_questions(activity_id,question_id,sort_order)
select '72000000-0000-0000-0000-000000000101',id,
  row_number() over(order by id)
from public.questions
where id between '83000000-0000-0000-0000-000000000101'
  and '83000000-0000-0000-0000-000000000108'
on conflict(activity_id,question_id) do nothing;
