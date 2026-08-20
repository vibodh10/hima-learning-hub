-- Hosted-safe adaptive curriculum seed. Fictional curriculum and rewards only:
-- no Auth users, passwords, enrolments, attempts, or personal data.

update public.courses set
  title='Pearson BTEC Level 3 National Information Technology',
  qualification='Pearson BTEC Level 3 National',
  slug='pearson-btec-l3-national-it',
  curriculum_kind='qualification',
  published=true
where id='30000000-0000-0000-0000-000000000001';

update public.units set title='Creating Systems to Manage Information',sort_order=1,status='approved'
where id='40000000-0000-0000-0000-000000000002';
update public.units set title='Programming',sort_order=2,status='approved'
where id='40000000-0000-0000-0000-000000000004';
update public.units set title='Website Development',sort_order=3,status='approved'
where id='40000000-0000-0000-0000-000000000006';
update public.units set title='Computer Games Development',sort_order=4,status='approved'
where id='40000000-0000-0000-0000-000000000008';
update public.units set title='IT Project Management',sort_order=5,status='approved'
where id='40000000-0000-0000-0000-000000000009';

insert into public.courses(id,organisation_id,title,qualification,slug,curriculum_kind,published)
values(
  '30000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  'T Level Digital Software Development',
  'T Level','t-level-digital-software-development','content_area',false
)
on conflict(id) do update set title=excluded.title,qualification=excluded.qualification,
  slug=excluded.slug,curriculum_kind=excluded.curriculum_kind,published=excluded.published;

insert into public.units(id,course_id,code,title,sort_order,status,description) values
('42000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002','problem-solving','Problem solving',1,'draft','Future T Level content area; not student-published.'),
('42000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','programming','Introduction to programming',2,'draft','Future T Level content area; not student-published.'),
('42000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000002','data','Data',3,'draft','Future T Level content area; not student-published.'),
('42000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000002','digital-environments','Digital environments',4,'draft','Future T Level content area; not student-published.'),
('42000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000002','security','Security',5,'draft','Future T Level content area; not student-published.'),
('42000000-0000-0000-0000-000000000006','30000000-0000-0000-0000-000000000002','legislation','Legislation and regulation',6,'draft','Future T Level content area; not student-published.'),
('42000000-0000-0000-0000-000000000007','30000000-0000-0000-0000-000000000002','business-context','Business context',7,'draft','Future T Level content area; not student-published.'),
('42000000-0000-0000-0000-000000000008','30000000-0000-0000-0000-000000000002','emerging-issues','Emerging issues',8,'draft','Future T Level content area; not student-published.'),
('42000000-0000-0000-0000-000000000009','30000000-0000-0000-0000-000000000002','software-development-skills','Software-development skills',9,'draft','Future T Level content area; not student-published.')
on conflict(id) do update set title=excluded.title,sort_order=excluded.sort_order,
  status=excluded.status,description=excluded.description;

insert into public.learning_aims(id,unit_id,code,title,description,sort_order,status) values
('41000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','A',
 'Understand computational thinking and programming concepts',
 'Use programming concepts and computational thinking to understand and plan solutions.',1,'approved'),
('41000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000004','B',
 'Design and develop programs',
 'Develop, test, debug and improve programs using appropriate constructs.',2,'approved')
on conflict(unit_id,code) do update set title=excluded.title,description=excluded.description,status=excluded.status;

insert into public.topics(id,unit_id,learning_aim_id,title,description,sort_order,status) values
('51000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004',
 '41000000-0000-0000-0000-000000000001',
 'Variables, data types, input, processing and output',
 'Use Python variables and appropriate data types to accept, process and present data.',1,'approved')
on conflict(id) do update set learning_aim_id=excluded.learning_aim_id,title=excluded.title,
  description=excluded.description,status=excluded.status;

insert into public.skills(id,topic_id,code,title,description,sort_order,status) values
('52000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','variables',
 'Create and update variables','Choose meaningful names, assign values and trace state changes.',1,'approved'),
('52000000-0000-0000-0000-000000000002','51000000-0000-0000-0000-000000000001','data-types',
 'Select and explain data types','Distinguish strings, integers, floats and Booleans and choose an appropriate type.',2,'approved'),
('52000000-0000-0000-0000-000000000003','51000000-0000-0000-0000-000000000001','input-conversion',
 'Accept and convert input','Use input and explicit conversion safely before numeric processing.',3,'approved'),
('52000000-0000-0000-0000-000000000004','51000000-0000-0000-0000-000000000001','processing',
 'Process values with expressions','Apply arithmetic operators in the intended order and store results.',4,'approved'),
('52000000-0000-0000-0000-000000000005','51000000-0000-0000-0000-000000000001','output',
 'Produce clear formatted output','Use print and f-strings to present labelled, readable results.',5,'approved'),
('52000000-0000-0000-0000-000000000006','51000000-0000-0000-0000-000000000001','debugging',
 'Identify and correct Python errors','Distinguish syntax, type and logic errors in short programs.',6,'approved')
on conflict(topic_id,code) do update set title=excluded.title,description=excluded.description,status=excluded.status;

insert into public.lessons(
  id,topic_id,learning_aim_id,week_number,title,remember,learn,worked_example,
  reflection_prompt,status,language,objectives,estimated_minutes
) values(
  '61000000-0000-0000-0000-000000000001',
  '51000000-0000-0000-0000-000000000001',
  '41000000-0000-0000-0000-000000000001',
  1,'Python foundations: input, processing and output',
  'A variable name refers to a value. input() always returns a string.',
  'Use meaningful variables and explicit conversion so each value has the type needed by the processing.',
  'Plan inputs, convert types, calculate a result, then present it with a labelled f-string.',
  'Which conversion or output decision are you least confident about?',
  'approved','Python',
  '["Trace variable values","Choose appropriate data types","Convert input for arithmetic","Calculate and format output","Debug common type errors"]',
  60
) on conflict(id) do update set title=excluded.title,status=excluded.status,objectives=excluded.objectives;

insert into public.teaching_screens(
  id,lesson_id,sort_order,title,body,example,code_sample,definition,common_mistake,remember_text,status
) values
('62000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001',1,
 'Variables hold program state',
 'A variable is a named reference to a value. Assignment evaluates the expression on the right and stores the result under the name on the left.',
 'After score = 12 and score = score + 3, score refers to 15.',
 E'score = 12\nscore = score + 3',
 'Assignment: storing the result of an expression in a named variable.',
 'Reading = as “is equal to” rather than “assign the value”.',
 'Trace one statement at a time; the newest assignment is the current value.','approved'),
('62000000-0000-0000-0000-000000000002','61000000-0000-0000-0000-000000000001',2,
 'Data types affect valid operations',
 'Python values have types. int stores whole numbers, float stores decimal values, str stores text and bool stores True or False.',
 'A quantity is normally int; a measured temperature may be float; a postcode must be str.',
 E'quantity = 4\ntemperature = 18.5\npostcode = \"NE1 4AB\"\nactive = True',
 'Data type: the category of a value, determining its representation and valid operations.',
 'Choosing int for identifiers that may contain letters or leading zeroes.',
 'Choose a type from meaning, not from how a value happens to look.','approved'),
('62000000-0000-0000-0000-000000000003','61000000-0000-0000-0000-000000000001',3,
 'Input must be converted for arithmetic',
 'input() pauses for keyboard input and always returns a string. Convert with int() or float() before arithmetic when numeric input is required.',
 'If a learner types 17, input returns \"17\"; int(\"17\") returns the integer 17.',
 E'age_text = input(\"Age: \")\nage = int(age_text)\nnext_age = age + 1',
 'Type conversion: creating an equivalent value of another type.',
 'Writing input(\"Age: \") + 1, which attempts to add a string and integer.',
 'Convert at the boundary, then work with a correctly typed variable.','approved'),
('62000000-0000-0000-0000-000000000004','61000000-0000-0000-0000-000000000001',4,
 'Processing uses expressions',
 'Expressions combine values, variables and operators. Parentheses make intended order explicit and intermediate variables make calculations easier to test.',
 'A total including 20% VAT is subtotal * 1.20.',
 E'subtotal = price * quantity\ntotal = subtotal * 1.20',
 'Expression: values and operators that Python evaluates to produce a result.',
 'Applying VAT to price before multiplying when the requirement defines VAT on the subtotal.',
 'Break a calculation into named steps when it improves clarity and testing.','approved'),
('62000000-0000-0000-0000-000000000005','61000000-0000-0000-0000-000000000001',5,
 'Output should communicate meaning',
 'print() displays values. An f-string places evaluated expressions inside braces and can apply formatting such as two decimal places.',
 'A total of 7.5 can be displayed as Total: £7.50.',
 E'total = 7.5\nprint(f\"Total: £{total:.2f}\")',
 'f-string: a string prefixed with f that evaluates expressions inside braces.',
 'Printing an unlabelled number so the user cannot tell what it represents.',
 'Output is part of the interface: label it and format it for its audience.','approved')
on conflict(lesson_id,sort_order) do update set title=excluded.title,body=excluded.body,
  code_sample=excluded.code_sample,status=excluded.status;

insert into public.worked_examples(
  id,lesson_id,skill_id,sort_order,title,problem,planned_solution,worked_steps,
  code_sample,expected_output,common_error,status
) values
('63000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001',
 '52000000-0000-0000-0000-000000000003',1,'Calculate a learner’s age next year',
 'Ask for a learner’s age and display their age next year.',
 'Input age as text, convert it to int, add one, then display a labelled result.',
 '["Read the value with input","Convert with int","Add one","Display with an f-string"]',
 E'age_text = input(\"Age: \")\nage = int(age_text)\nnext_age = age + 1\nprint(f\"Next year: {next_age}\")',
 'Age: 17\nNext year: 18',
 'Omitting int() causes a TypeError when adding 1 to a string.','approved'),
('63000000-0000-0000-0000-000000000002','61000000-0000-0000-0000-000000000001',
 '52000000-0000-0000-0000-000000000004',2,'Calculate an order total',
 'Ask for a unit price and quantity, then display the total to two decimal places.',
 'Convert price to float and quantity to int, multiply them, then format the total.',
 '["Convert inputs independently","Calculate price * quantity","Format with :.2f"]',
 E'price = float(input(\"Price: \"))\nquantity = int(input(\"Quantity: \"))\ntotal = price * quantity\nprint(f\"Total: £{total:.2f}\")',
 'Price: 2.5\nQuantity: 3\nTotal: £7.50',
 'Using int for a decimal price either fails or loses the required precision.','approved'),
('63000000-0000-0000-0000-000000000003','61000000-0000-0000-0000-000000000001',
 '52000000-0000-0000-0000-000000000006',3,'Debug string concatenation instead of addition',
 'Correct a program that prints 105 when the inputs are 10 and 5.',
 'Recognise that both inputs are strings, convert them, then add the integers.',
 '["Trace the types","Identify concatenation","Convert both inputs","Retest expected output"]',
 E'first = int(input(\"First: \"))\nsecond = int(input(\"Second: \"))\ntotal = first + second\nprint(total)',
 'First: 10\nSecond: 5\n15',
 'Converting only one input still attempts to combine incompatible types.','approved')
on conflict(lesson_id,sort_order) do update set title=excluded.title,worked_steps=excluded.worked_steps,
  code_sample=excluded.code_sample,status=excluded.status;

insert into public.activities(
  id,lesson_id,title,kind,pathway,learning_stage,status,estimated_minutes,max_attempts,
  required,automatic_marking,instructions,home_session_number
) values
('71000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001',
 'Guided Python foundations','in_class_practice','Support','guided_practice','approved',15,5,true,true,
 'Use the hints and explanations to build accurate foundations.',null),
('71000000-0000-0000-0000-000000000002','61000000-0000-0000-0000-000000000001',
 'Core Python foundations','homework','Core','core_practice','approved',18,5,true,true,
 'Complete independently after the lesson.',1),
('71000000-0000-0000-0000-000000000003','61000000-0000-0000-0000-000000000001',
 'Python debugging and application challenge','skills_practice','Stretch','challenge_practice','approved',15,5,false,true,
 'Apply more than one skill to unfamiliar scenarios.',2),
('71000000-0000-0000-0000-000000000004','61000000-0000-0000-0000-000000000001',
 'Python foundations mastery check','review_check','Mastery','mastery_check','approved',12,3,true,true,
 'Complete without hints to demonstrate secure independent understanding.',3),
('71000000-0000-0000-0000-000000000005','61000000-0000-0000-0000-000000000001',
 'Python foundations retrieval review','review_check','Core','retrieval_review','approved',10,3,true,true,
 'Complete later using different questions covering the same skills.',null)
on conflict(id) do update set title=excluded.title,learning_stage=excluded.learning_stage,
  status=excluded.status,instructions=excluded.instructions;

-- Every pilot question is approved and mapped to a specific skill. The final
-- five are different retrieval questions covering the same skill set.
insert into public.questions(
  id,course_id,unit_id,learning_aim_id,topic_id,skill_id,difficulty,pathway,kind,
  question_text,correct_answer,acceptable_answers,feedback_correct,feedback_incorrect,
  explanation,hint,marks,tags,estimated_seconds,status,approved_at
) values
('81000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000001','Support','Support','code_output',E'What is printed?\nscore = 4\nscore = score + 3\nprint(score)','"7"','[]','Correct: the second assignment stores 7.','Trace the value after each line.','The current value of score becomes 7 before print runs.','Start with 4, then add 3.',1,'{python,variables,guided}',45,'approved',now()),
('81000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000002','Support','Support','single_choice','Which type is most appropriate for the quantity of items in a basket?','"int"','[]','Correct: a quantity is a whole number.','Choose the type that represents whole numbers.','int stores whole numbers without a fractional part.','Would 3.5 items be valid?',1,'{python,data-types,guided}',45,'approved',now()),
('81000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000003','Support','Support','fill_blank','Complete the conversion: age = ___(input("Age: "))','"int"','["builtins.int"]','Correct: int converts numeric text to a whole number.','input returns text, so choose the whole-number converter.','The result must be an integer before arithmetic.','The required value has no decimal part.',1,'{python,input,conversion,guided}',45,'approved',now()),
('81000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000004','Core','Support','numeric','What value is stored in total? price = 2.5; quantity = 4; total = price * quantity','10','[]','Correct: 2.5 multiplied by 4 is 10.','Multiply the unit price by the quantity.','The expression evaluates before its result is assigned to total.','Calculate 2.5 + 2.5 + 2.5 + 2.5.',1,'{python,processing,guided}',45,'approved',now()),
('81000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000005','Support','Support','code_completion','Complete the f-string: print(f"Total: £{total:___}")','".2f"','[".2F"]','Correct: .2f displays two digits after the decimal point.','Use the floating-point format for two decimal places.','The format specification follows a colon inside the braces.','Two decimal places uses precision 2.',1,'{python,output,guided}',60,'approved',now()),
('81000000-0000-0000-0000-000000000006','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000006','Core','Support','identify_error',E'Identify the cause of the error:\nage = input("Age: ")\nprint(age + 1)','"age is a string"','["input returns a string","missing int conversion","age has not been converted to int"]','Correct: input returns a string and must be converted.','Trace the type returned by input.','Adding an integer to a string raises a TypeError.','What type does input always return?',1,'{python,debugging,guided}',60,'approved',now()),
('81000000-0000-0000-0000-000000000007','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000001','Core','Core','true_false','A variable can be assigned a new value later in a Python program.','true','[]','Correct: reassignment updates the value referenced by the name.','Review how score = score + 1 works.','Python variables can be rebound to new values.','Think about a score increasing.',1,'{python,variables,core}',35,'approved',now()),
('81000000-0000-0000-0000-000000000008','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000001','Core','Core','code_output',E'x = 3\ny = x\nx = 8\nprint(y)','"3"','[]','Correct: y keeps the value 3 assigned earlier.','Trace each assignment in order.','Assigning x to y copies the current immutable integer value.','What was x when y was assigned?',1,'{python,variables,core}',45,'approved',now()),
('81000000-0000-0000-0000-000000000009','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000002','Core','Core','multiple_response','Select both values that have type float.','["3.0","-0.25"]','[]','Correct: both include a decimal point and are numeric literals.','Look for decimal numeric literals, not quoted text.','3.0 and -0.25 are floats; "3.0" is a string.','Quotation marks create a string.',2,'{python,data-types,core}',50,'approved',now()),
('81000000-0000-0000-0000-000000000010','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000002','Core','Core','scenario_decision','A college stores a room code such as 04B. Which Python type should be used?','"str"','["string"]','Correct: the value contains a leading zero and a letter.','An identifier is not used for arithmetic.','str preserves all characters in the room code.','Consider whether 04B is a quantity.',1,'{python,data-types,core}',45,'approved',now()),
('81000000-0000-0000-0000-000000000011','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000003','Core','Core','code_completion','Complete the line: temperature = ___(input("Temperature: "))','"float"','[]','Correct: float supports decimal temperatures.','The measurement may contain a decimal part.','float converts numeric text such as 18.5.','Choose a numeric type that permits decimals.',1,'{python,input,conversion,core}',45,'approved',now()),
('81000000-0000-0000-0000-000000000012','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000003','Core','Core','code_output',E'number = int("12")\nprint(number + 5)','"17"','[]','Correct: int converts "12" before addition.','Convert first, then add.','The integer values 12 and 5 sum to 17.','What value does int("12") create?',1,'{python,input,conversion,core}',40,'approved',now()),
('81000000-0000-0000-0000-000000000013','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000004','Core','Core','numeric','What is the result of 5 + 2 * 3 in Python?','11','[]','Correct: multiplication is evaluated before addition.','Apply operator precedence.','2 * 3 is 6, then 5 + 6 is 11.','Calculate the multiplication first.',1,'{python,processing,core}',40,'approved',now()),
('81000000-0000-0000-0000-000000000014','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000004','Core','Core','code_output',E'subtotal = 20\nvat = subtotal * 0.2\ntotal = subtotal + vat\nprint(total)','"24.0"','["24"]','Correct: VAT is 4 and the total is 24.','Find 20% of 20, then add it.','The intermediate value vat is 4.0.','0.2 represents 20%.',1,'{python,processing,core}',55,'approved',now()),
('81000000-0000-0000-0000-000000000015','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000005','Core','Core','fill_blank','Complete the output statement: print(f"Hello, {___}") when the variable is called name.','"name"','[]','Correct: braces contain the expression to evaluate.','Use the existing variable name inside the braces.','The f-string replaces {name} with its current value.','Which variable contains the user’s name?',1,'{python,output,core}',40,'approved',now()),
('81000000-0000-0000-0000-000000000016','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000005','Core','Core','single_choice','Which output is clearest for a calculated value of 18.5?','"Average: 18.5"','[]','Correct: the label explains the value.','Choose output that gives the number context.','User-facing output should communicate meaning, not only data.','Which option tells the user what 18.5 represents?',1,'{python,output,core}',35,'approved',now()),
('81000000-0000-0000-0000-000000000017','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000006','Core','Core','identify_error',E'What error occurs?\nquantity = int(input("Quantity: "))\ntotal = price * quantity','"price is not defined"','["NameError","undefined variable price"]','Correct: price is used before it has been assigned.','Check every variable used in the expression.','Python raises NameError because no value is bound to price.','Where is price assigned?',1,'{python,debugging,core}',55,'approved',now()),
('81000000-0000-0000-0000-000000000018','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000006','Core','Core','correct_code',E'Correct the conversion line:\nage = input(int("Age: "))','"age = int(input(\"Age: \"))"','["age=int(input(\"Age: \"))"]','Correct: read text first, then convert the returned value.','The prompt belongs inside input; int wraps the input call.','Function calls are nested from the inside out.','Which function should run first?',2,'{python,debugging,core}',75,'approved',now()),
('81000000-0000-0000-0000-000000000019','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000001','Stretch','Stretch','code_output',E'a = 2\nb = 5\na = a + b\nb = a - b\nprint(a, b)','"7 2"','["7, 2"]','Correct: a becomes 7, then b becomes 7 - 5 = 2.','Trace the newest value after each assignment.','The second expression uses the updated value of a.','Do not reuse the original value of a after line 3.',2,'{python,variables,challenge}',75,'approved',now()),
('81000000-0000-0000-0000-000000000020','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000002','Stretch','Stretch','scenario_decision','A sensor reading may be 0.0, negative, or contain decimals. Choose the most appropriate type.','"float"','[]','Correct: float represents the required decimal measurements.','The range includes fractional values.','An int cannot directly represent a value such as -0.25.','Which type supports a fractional part?',1,'{python,data-types,challenge}',50,'approved',now()),
('81000000-0000-0000-0000-000000000021','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000003','Stretch','Stretch','correct_code',E'Correct the program so it calculates 10 + 5:\nfirst = input("First: ")\nsecond = int(input("Second: "))\nprint(first + second)','"first = int(input(\"First: \"))"','["convert first with int","first=int(input(\"First: \"))"]','Correct: both operands must be integers.','second is already converted; inspect first.','Converting first makes both operands compatible for numeric addition.','Which input remains a string?',2,'{python,input,debugging,challenge}',75,'approved',now()),
('81000000-0000-0000-0000-000000000022','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000004','Stretch','Stretch','numeric','A £48 subtotal receives a 15% discount. What is the final amount?','40.8','["40.80"]','Correct: 48 * 0.85 is 40.80.','A 15% discount leaves 85% to pay.','Multiplying by 0.85 applies the remaining proportion directly.','Calculate 48 × (1 - 0.15).',2,'{python,processing,challenge}',75,'approved',now()),
('81000000-0000-0000-0000-000000000023','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000005','Stretch','Stretch','code_completion','Complete the output to show 40.8 as £40.80: print(f"Final: £{amount:___}")','".2f"','[]','Correct: .2f forces two decimal places.','Use the same precision convention as currency.','The f-string format specification is placed after the colon.','Currency normally displays two digits after the decimal.',1,'{python,output,challenge}',55,'approved',now()),
('81000000-0000-0000-0000-000000000024','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000006','Stretch','Stretch','identify_error',E'The requirement is to average two scores. Why is this logic wrong?\naverage = first + second / 2','"operator precedence"','["missing parentheses","only second is divided by 2"]','Correct: division runs before addition.','Compare the expression with (first + second) / 2.','Without parentheses only second is halved before first is added.','Which operator runs first?',2,'{python,debugging,processing,challenge}',70,'approved',now()),
('81000000-0000-0000-0000-000000000025','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000001','Mastery','Mastery','code_output',E'count = 6\ncount = count * 2\ncount = count - 5\nprint(count)','"7"','[]','Correct.','Trace each assignment independently.','The values are 6, then 12, then 7.',null,1,'{python,variables,mastery}',50,'approved',now()),
('81000000-0000-0000-0000-000000000026','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000002','Mastery','Mastery','scenario_decision','Choose the best types for product_code="007A", stock=12 and price=3.75.','"str, int, float"','["string, integer, float","str,int,float"]','Correct.','Match each value to its meaning and valid operations.','The identifier needs preserved characters, stock is whole, and price may be decimal.',null,2,'{python,data-types,mastery}',65,'approved',now()),
('81000000-0000-0000-0000-000000000027','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000003','Mastery','Mastery','correct_code',E'Correct the complete input statement for a decimal distance:\ndistance = input(float("Distance: "))','"distance = float(input(\"Distance: \"))"','["distance=float(input(\"Distance: \"))"]','Correct.','The prompt is passed to input before conversion.','input runs first and float converts its result.',null,2,'{python,input,mastery}',65,'approved',now()),
('81000000-0000-0000-0000-000000000028','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000004','Mastery','Mastery','code_output',E'width = 3.5\nheight = 2\narea = width * height\nprint(f"{area:.1f}")','"7.0"','[]','Correct.','Calculate the area and apply one-decimal formatting.','3.5 * 2 is 7.0 and .1f keeps one decimal place.',null,2,'{python,processing,output,mastery}',65,'approved',now()),
('81000000-0000-0000-0000-000000000029','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000006','Mastery','Mastery','identify_error',E'A program runs but reports the wrong average:\naverage = first + second / 2\nName the error category.','"logic error"','["logic","logical error"]','Correct.','The code is valid Python but produces the wrong result.','A logic error produces an unintended result without necessarily stopping execution.',null,1,'{python,debugging,mastery}',50,'approved',now()),
('81000000-0000-0000-0000-000000000030','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000001','Core','Core','code_output',E'points = 9\nbonus = 4\npoints = points + bonus\nprint(points)','"13"','[]','Correct retrieval.','Trace the changed variable.','The updated points value is 13.',null,1,'{python,variables,retrieval}',40,'approved',now()),
('81000000-0000-0000-0000-000000000031','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000002','Core','Core','single_choice','Which type best represents whether a user has accepted terms?','"bool"','[]','Correct retrieval.','The value has two logical states.','bool represents True or False.',null,1,'{python,data-types,retrieval}',35,'approved',now()),
('81000000-0000-0000-0000-000000000032','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000003','Core','Core','fill_blank','Complete the numeric input: tickets = ___(input("Tickets: "))','"int"','[]','Correct retrieval.','Tickets are counted as whole numbers.','int converts the input string to a whole number.',null,1,'{python,input,retrieval}',40,'approved',now()),
('81000000-0000-0000-0000-000000000033','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000004','Core','Core','numeric','A £30 item is reduced by 20%. What is the sale price?','24','["24.0","24.00"]','Correct retrieval.','A 20% reduction leaves 80%.','30 * 0.8 is 24.',null,1,'{python,processing,retrieval}',45,'approved',now()),
('81000000-0000-0000-0000-000000000034','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','41000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000006','Core','Core','correct_code',E'Correct the total calculation:\nprice = float(input("Price: "))\nquantity = int(input("Quantity: "))\ntotal = price + quantity','"total = price * quantity"','["total=price*quantity"]','Correct retrieval.','The requirement is price for each item.','The total cost is unit price multiplied by quantity.',null,2,'{python,debugging,retrieval}',60,'approved',now())
on conflict(id) do update set skill_id=excluded.skill_id,question_text=excluded.question_text,
  correct_answer=excluded.correct_answer,acceptable_answers=excluded.acceptable_answers,
  feedback_correct=excluded.feedback_correct,feedback_incorrect=excluded.feedback_incorrect,
  explanation=excluded.explanation,hint=excluded.hint,status=excluded.status;

insert into public.question_options(question_id,option_text,sort_order) values
('81000000-0000-0000-0000-000000000002','int',1),
('81000000-0000-0000-0000-000000000002','float',2),
('81000000-0000-0000-0000-000000000002','str',3),
('81000000-0000-0000-0000-000000000009','3.0',1),
('81000000-0000-0000-0000-000000000009','-0.25',2),
('81000000-0000-0000-0000-000000000009','"3.0"',3),
('81000000-0000-0000-0000-000000000010','str',1),
('81000000-0000-0000-0000-000000000010','int',2),
('81000000-0000-0000-0000-000000000010','float',3),
('81000000-0000-0000-0000-000000000016','Average: 18.5',1),
('81000000-0000-0000-0000-000000000016','18.5',2),
('81000000-0000-0000-0000-000000000016','value',3),
('81000000-0000-0000-0000-000000000020','float',1),
('81000000-0000-0000-0000-000000000020','int',2),
('81000000-0000-0000-0000-000000000020','str',3),
('81000000-0000-0000-0000-000000000031','bool',1),
('81000000-0000-0000-0000-000000000031','str',2),
('81000000-0000-0000-0000-000000000031','float',3)
on conflict(question_id,sort_order) do update set option_text=excluded.option_text;

insert into public.activity_questions(activity_id,question_id,sort_order)
select '71000000-0000-0000-0000-000000000001',id,
  row_number() over(order by id)
from public.questions where id between '81000000-0000-0000-0000-000000000001' and '81000000-0000-0000-0000-000000000006'
on conflict(activity_id,question_id) do nothing;
insert into public.activity_questions(activity_id,question_id,sort_order)
select '71000000-0000-0000-0000-000000000002',id,
  row_number() over(order by id)
from public.questions where id between '81000000-0000-0000-0000-000000000007' and '81000000-0000-0000-0000-000000000018'
on conflict(activity_id,question_id) do nothing;
insert into public.activity_questions(activity_id,question_id,sort_order)
select '71000000-0000-0000-0000-000000000003',id,
  row_number() over(order by id)
from public.questions where id between '81000000-0000-0000-0000-000000000019' and '81000000-0000-0000-0000-000000000024'
on conflict(activity_id,question_id) do nothing;
insert into public.activity_questions(activity_id,question_id,sort_order)
select '71000000-0000-0000-0000-000000000004',id,
  row_number() over(order by id)
from public.questions where id between '81000000-0000-0000-0000-000000000025' and '81000000-0000-0000-0000-000000000029'
on conflict(activity_id,question_id) do nothing;
insert into public.activity_questions(activity_id,question_id,sort_order)
select '71000000-0000-0000-0000-000000000005',id,
  row_number() over(order by id)
from public.questions where id between '81000000-0000-0000-0000-000000000030' and '81000000-0000-0000-0000-000000000034'
on conflict(activity_id,question_id) do nothing;

insert into public.question_templates(
  id,organisation_id,skill_id,title,kind,template_text,parameter_schema,
  answer_template,deterministic_generator,status,authored_by
)
select
  '64000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '52000000-0000-0000-0000-000000000001',
  'Variable update trace','code_output',
  E'{name} = {start}\n{name} = {name} + {change}\nprint({name})',
  '{"name":{"type":"identifier","allow":["score","points","count"]},"start":{"type":"integer","min":1,"max":20},"change":{"type":"integer","min":1,"max":10}}',
  '{"expression":"start + change"}',
  'variable_addition_v1','approved',p.id
from public.user_profiles p
where p.organisation_id='10000000-0000-0000-0000-000000000001'
  and p.role in ('teacher','administrator')
order by case p.role when 'administrator' then 1 else 2 end,p.created_at
limit 1
on conflict(id) do nothing;

insert into public.question_template_variants(
  template_id,question_id,parameters,generated_text,generated_answer,status,approved_by,approved_at
)
select t.id,v.question_id,v.parameters,v.generated_text,v.generated_answer,'approved',
  t.authored_by,now()
from public.question_templates t
cross join (values
  ('81000000-0000-0000-0000-000000000001'::uuid,
   '{"name":"score","start":4,"change":3}'::jsonb,
   E'score = 4\nscore = score + 3\nprint(score)',
   '"7"'::jsonb),
  (null::uuid,
   '{"name":"points","start":9,"change":4}'::jsonb,
   E'points = 9\npoints = points + 4\nprint(points)',
   '"13"'::jsonb),
  (null::uuid,
   '{"name":"count","start":6,"change":5}'::jsonb,
   E'count = 6\ncount = count + 5\nprint(count)',
   '"11"'::jsonb)
) as v(question_id,parameters,generated_text,generated_answer)
where t.id='64000000-0000-0000-0000-000000000001'
on conflict(template_id,parameters) do update set
  generated_text=excluded.generated_text,generated_answer=excluded.generated_answer,
  status='approved',approved_by=excluded.approved_by,approved_at=excluded.approved_at;

insert into public.misconceptions(id,skill_id,code,title,description,reteach_guidance) values
('65000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000001','assignment-comparison',
 'Confuses assignment with comparison','Reads assignment as a comparison rather than a state change.',
 'Trace the right-hand expression, then write the new variable value.'),
('65000000-0000-0000-0000-000000000002','52000000-0000-0000-0000-000000000003','input-string',
 'Treats input as a number','Uses input text directly in arithmetic without conversion.',
 'Label the type returned by input and convert at the input boundary.'),
('65000000-0000-0000-0000-000000000003','52000000-0000-0000-0000-000000000006','operator-precedence',
 'Misapplies operator precedence','Evaluates addition before multiplication or division without parentheses.',
 'Trace multiplication/division first and compare with an explicitly parenthesised expression.'),
('65000000-0000-0000-0000-000000000004','52000000-0000-0000-0000-000000000006','undefined-variable',
 'Uses an undefined variable','References a name before a value has been assigned.',
 'Highlight every variable use and locate the earlier assignment.')
on conflict(skill_id,code) do update set title=excluded.title,description=excluded.description,
  reteach_guidance=excluded.reteach_guidance;

insert into public.question_misconceptions(question_id,misconception_id) values
('81000000-0000-0000-0000-000000000003','65000000-0000-0000-0000-000000000002'),
('81000000-0000-0000-0000-000000000006','65000000-0000-0000-0000-000000000002'),
('81000000-0000-0000-0000-000000000017','65000000-0000-0000-0000-000000000004'),
('81000000-0000-0000-0000-000000000018','65000000-0000-0000-0000-000000000002'),
('81000000-0000-0000-0000-000000000024','65000000-0000-0000-0000-000000000003'),
('81000000-0000-0000-0000-000000000029','65000000-0000-0000-0000-000000000003')
on conflict(question_id,misconception_id) do nothing;

insert into public.badge_definitions(
  id,organisation_id,code,title,description,icon,criteria,one_time,enabled
) values
('66000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','first-step',
 'First Step','Complete the first lesson.','footprints','{"completed_activities":1}',true,true),
('66000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','practice-starter',
 'Practice Starter','Complete five practice sessions.','practice','{"completed_activities":5}',true,true),
('66000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','consistent-learner',
 'Consistent Learner','Practise on three separate scheduled days.','calendar','{"separate_practice_days":3}',true,true),
('66000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','python-explorer',
 'Python Explorer','Complete the first Python topic.','python','{"topic_id":"51000000-0000-0000-0000-000000000001","completion":100}',true,true),
('66000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001','debugging-detective',
 'Debugging Detective','Correct ten code errors.','bug','{"tag":"debugging","correct_count":10}',true,true),
('66000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000001','comeback',
 'Comeback','Improve a previous activity score by at least 20 points.','up','{"improvement":20}',true,true),
('66000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000001','weekly-mastery',
 'Weekly Mastery','Complete all required learning for a week.','week','{"weekly_required_completion":100}',false,true),
('66000000-0000-0000-0000-000000000008','10000000-0000-0000-0000-000000000001','topic-master',
 'Topic Master','Achieve mastery in every skill in a topic.','crown','{"all_topic_skills_pathway":"Mastery"}',true,true),
('66000000-0000-0000-0000-000000000009','10000000-0000-0000-0000-000000000001','database-builder',
 'Database Builder','Complete an approved database topic.','database','{"unit_code":"2","topic_completion":100}',true,true),
('66000000-0000-0000-0000-000000000010','10000000-0000-0000-0000-000000000001','web-creator',
 'Web Creator','Complete an approved website-development topic.','web','{"unit_code":"6","topic_completion":100}',true,true),
('66000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000001','game-designer',
 'Game Designer','Complete an approved games-development topic.','game','{"unit_code":"8","topic_completion":100}',true,true),
('66000000-0000-0000-0000-000000000012','10000000-0000-0000-0000-000000000001','project-planner',
 'Project Planner','Complete an approved project-management topic.','plan','{"unit_code":"9","topic_completion":100}',true,true),
('66000000-0000-0000-0000-000000000013','10000000-0000-0000-0000-000000000001','progress-champion',
 'Progress Champion','Demonstrate significant improvement on equivalent questions.','progress','{"comparison_status":"Significant Improvement"}',true,true),
('66000000-0000-0000-0000-000000000014','10000000-0000-0000-0000-000000000001','retrieval-master',
 'Retrieval Master','Achieve mastery in a delayed retrieval review.','memory','{"retention_pathway":"Mastery"}',true,true),
('66000000-0000-0000-0000-000000000015','10000000-0000-0000-0000-000000000001','fast-track-achieved',
 'Fast Track Achieved','Securely demonstrate a topic on multiple occasions and move ahead.','fast','{"route":"Fast-Tracked"}',true,true)
on conflict(organisation_id,code) do update set title=excluded.title,description=excluded.description,
  criteria=excluded.criteria,enabled=excluded.enabled;

insert into public.reward_items(
  id,organisation_id,code,title,description,kind,price,asset_config
) values
('67000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','theme-ocean',
 'Ocean profile theme','A calm teal-and-blue profile theme.','profile_theme',40,'{"theme":"ocean"}'),
('67000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','frame-python',
 'Python badge frame','A cosmetic Python-inspired badge frame.','badge_frame',60,'{"frame":"python"}'),
('67000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','celebration-confetti',
 'Confetti celebration','Optional confetti after a mastery check.','celebration_effect',80,'{"effect":"confetti"}')
on conflict(organisation_id,code) do update set title=excluded.title,description=excluded.description,
  price=excluded.price,asset_config=excluded.asset_config,enabled=true;

-- Draft placeholders are teacher-visible but never student-published.
insert into public.topics(unit_id,title,sort_order,status,description)
select '40000000-0000-0000-0000-000000000004',v.title,v.ord + 1,'draft',
  'Curriculum placeholder; lesson content requires teacher approval.'
from unnest(array[
  'Computational thinking','Decomposition','Abstraction','Problem definition',
  'Algorithms','Flowcharts','Pseudocode','Variables','Constants','Data types',
  'Input','Output','Type conversion','Arithmetic operators','Relational operators',
  'Boolean operators','Selection','Iteration','Functions','Procedures','Parameters',
  'Return values','Strings','Lists','Dictionaries','Validation','Exception handling',
  'File handling','Testing','Debugging','Maintainability','Commenting','Documentation'
]) with ordinality as v(title,ord)
where not exists(select 1 from public.topics t
  where t.unit_id='40000000-0000-0000-0000-000000000004' and t.title=v.title);

insert into public.topics(unit_id,title,sort_order,status,description)
select '40000000-0000-0000-0000-000000000002',v.title,v.ord,'draft',
  'Curriculum placeholder; lesson content requires teacher approval.'
from unnest(array[
  'Purpose of databases','Database requirements','Entities','Attributes','Records',
  'Fields','Tables','Data types','Primary keys','Foreign keys','Relationships',
  'Entity relationship diagrams','One-to-one relationships','One-to-many relationships',
  'Many-to-many relationships','Referential integrity','Validation','Normalisation',
  'Database design','Forms','Queries','Reports','Calculations','SQL','Testing',
  'Evaluation','Improvement'
]) with ordinality as v(title,ord)
where not exists(select 1 from public.topics t
  where t.unit_id='40000000-0000-0000-0000-000000000002' and t.title=v.title);

insert into public.topics(unit_id,title,sort_order,status,description)
select '40000000-0000-0000-0000-000000000006',v.title,v.ord,'draft',
  'Curriculum placeholder; lesson content requires teacher approval.'
from unnest(array[
  'Purposes of websites','Target audiences','Client requirements','User requirements',
  'Website design principles','Visual hierarchy','Navigation','Accessibility',
  'Responsive design','Wireframes','Site maps','HTML','Semantic HTML','CSS','Layouts',
  'Forms','JavaScript','Client-side scripting','Input validation','Testing',
  'Browser compatibility','Device compatibility','Performance','Optimisation',
  'Review','Improvement'
]) with ordinality as v(title,ord)
where not exists(select 1 from public.topics t
  where t.unit_id='40000000-0000-0000-0000-000000000006' and t.title=v.title);

insert into public.topics(unit_id,title,sort_order,status,description)
select '40000000-0000-0000-0000-000000000008',v.title,v.ord,'draft',
  'Curriculum placeholder; lesson content requires teacher approval.'
from unnest(array[
  'Game genres','Platforms','Audiences','Game mechanics','Game loops','Game states',
  'User interaction','Game design documents','Storyboards','Assets','Sprites','Animation',
  'Collision detection','Variables','Scoring','Lives','Levels','Sound','User interfaces',
  'Testing','Playability','Usability','Performance','Review','Improvement'
]) with ordinality as v(title,ord)
where not exists(select 1 from public.topics t
  where t.unit_id='40000000-0000-0000-0000-000000000008' and t.title=v.title);

insert into public.topics(unit_id,title,sort_order,status,description)
select '40000000-0000-0000-0000-000000000009',v.title,v.ord,'draft',
  'Curriculum placeholder; lesson content requires teacher approval.'
from unnest(array[
  'Project definitions','Business requirements','Stakeholders','Scope','Time','Cost',
  'Quality','Resources','Risks','Issues','Constraints','Assumptions','Feasibility',
  'Project lifecycle','Project methodologies','Waterfall','Agile','Milestones',
  'Dependencies','Gantt charts','Critical activities','Communication','Monitoring',
  'Change control','Project closure','Evaluation','Lessons learned'
]) with ordinality as v(title,ord)
where not exists(select 1 from public.topics t
  where t.unit_id='40000000-0000-0000-0000-000000000009' and t.title=v.title);
