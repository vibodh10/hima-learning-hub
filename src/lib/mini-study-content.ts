import type { StudyLesson, StudyQuestionKey } from "./mini-study";

export const studySources = {
  pearson:"https://qualifications.pearson.com/content/dam/pdf/BTEC-Nationals/Information-Technology/2016/specification-and-sample-assessments/specification-pearson-btec-level-3-national-extended-diploma-in-information-technology.pdf",
  wai:"https://www.w3.org/WAI/fundamentals/accessibility-principles/",
};

function choice(id:string, skill:string, prompt:string, answers:string[], explanation:string): StudyQuestionKey {
  return {id,skill,kind:"choice",prompt,options:answers.map((text,i)=>({id:`o${i+1}`,text})),answer:"o1",explanation};
}
function matching(id:string, skill:string, pairs:[string,string][], explanation:string): StudyQuestionKey {
  return {id,skill,kind:"match",prompt:"Match each idea to its meaning.",
    stems:pairs.map(([text],i)=>({id:`s${i+1}`,text})),options:pairs.map(([,text],i)=>({id:`o${i+1}`,text})),
    answer:Object.fromEntries(pairs.map((_,i)=>[`s${i+1}`,`o${i+1}`])),explanation};
}
type LessonInput = {id:string;title:string;skill:string;lines:string[];example:string;support:string;question:string;answers:string[];feedback:string;pairs:[string,string][];analysis:string;evaluation:string;wai?:boolean};
function lesson(input:LessonInput):StudyLesson {
  return {id:`u6-${input.id}-v1`,unitCode:"6",topicCode:"A1",title:input.title,skill:input.skill,lines:input.lines,example:input.example,support:input.support,analysis:input.analysis,evaluation:input.evaluation,
    questions:[choice(`${input.id}-check`,input.skill,input.question,input.answers,input.feedback),matching(`${input.id}-pairs`,input.skill,input.pairs,input.feedback)],
    sources:[studySources.pearson,...(input.wai?[studySources.wai]:[])]};
}

/** Original short self-study resources for Unit 6 learning aim A. Not an assignment, grade or claim of WCAG certification. */
export const unit6StudyLessons: StudyLesson[] = [
  lesson({id:"purpose",title:"Who is this website for?",skill:"purpose",
    lines:["A website's audience is the people it is designed for.","Its purpose is what it helps them do.","Judge features against that task, not your favourite colour."],
    example:"For a bus website, a passenger needs to find a route and departure time. A large timetable search helps that task more than a decorative animation.",
    support:"Ask: who is using it, and what are they trying to finish?",
    question:"Which feature best supports a passenger checking their next bus?",answers:["A clear route and departure-time search","A full-screen animation with no timetable link","A list of the designer's favourite colours"],feedback:"Match the feature to the passenger's task: finding their route and departure time.",pairs:[["Audience","The people using the website"],["Purpose","The task the website helps them do"]],analysis:"Because the search is easy to find, passengers need fewer steps to reach departure times.",evaluation:"The search is useful for regular passengers, but its value still depends on accurate timetable data."}),
  lesson({id:"usability",title:"Make a task easy to finish",skill:"usability",
    lines:["Usability is how well people can complete their task.","Look for clear labels, understandable steps and helpful feedback.","Observe a task to find problems instead of guessing."],
    example:"Website A labels a button 'Find a course'. Website B labels the same action 'Explore possibilities'. Ask a new visitor to find a course on each site.",support:"A useful label tells you what will happen when you select it.",
    question:"Which observation is useful evidence about usability?",answers:["A new visitor finds the course without help","The designer says the website is perfect","The homepage uses your favourite colour"],feedback:"An observed task tells you whether a visitor can use the website. Preference alone does not prove usability.",pairs:[["Clear label","Tells the user what an action does"],["Task observation","Shows what happens when someone tries it"]],analysis:"A clear label can reduce hesitation, so a first-time visitor may reach the course more easily.",evaluation:"Prefer A for new visitors if the task evidence supports it; one visitor alone is limited evidence."}),
  lesson({id:"accessibility",title:"Access for different users",skill:"accessibility",wai:true,
    lines:["Accessibility includes people with disabilities.","W3C publishes WCAG guidance for web content.","A site can look attractive and still contain barriers."],
    example:"A learner who cannot use a mouse needs to reach and activate the course link with a keyboard.",support:"Think about a person using the same page in a different way.",
    question:"What is the most useful check for someone who cannot use a mouse?",answers:["Try reaching and activating the link with a keyboard","Check only whether the logo is colourful","Count the images on the homepage"],feedback:"Keyboard access helps users who cannot use a mouse. This one check alone does not establish full WCAG conformance.",pairs:[["W3C","Publishes web standards and guidance"],["WCAG","Guidelines for accessible web content"]],analysis:"A keyboard barrier can prevent a learner from reaching course information at all.",evaluation:"A site with keyboard access is better for this task, but other accessibility requirements still need checking."}),
  lesson({id:"evidence",title:"Compare the same task",skill:"evidence",
    lines:["A fair comparison uses the same task on both websites.","Record what you observed and how you checked it.","Separate a fact from your opinion about it."],
    example:"On both college websites, find entry requirements for the same type of course. Record the route taken and any confusing labels.",support:"Use the same device and task where possible. Say what you could not check.",
    question:"Which comparison gives the most useful evidence?",answers:["Try the same course-search task on both sites and record the steps","Compare a shop checkout with a college contact page","Decide from the logos without trying either site"],feedback:"Using the same task makes the observations more comparable. Explain differences in device, content or users that limit the comparison.",pairs:[["Observation","What you actually saw or tested"],["Opinion","What you think about the result"]],analysis:"B needs an extra menu step, which may make the entry requirements harder to find.",evaluation:"A was easier in this test, but that does not prove every task is easier on A."}),
  lesson({id:"analysis",title:"Explain the effect",skill:"analysis",
    lines:["Analysis connects a feature to its effect on a user.","Use: feature → effect → why it matters for the task.","Compare the effect on both websites using your observations."],
    example:"A uses 'Entry requirements'; B uses 'Further details'. A's specific label may reduce guessing, helping applicants decide whether they can apply.",support:"Try this sentence: Because the site has…, the user can…, which helps them to…",
    question:"Which sentence analyses rather than just describes?",answers:["The specific label reduces guessing, helping applicants find the requirements","The website has a blue button","The page contains three pictures"],feedback:"Analysis develops a consequence for the audience and purpose. Naming colours or counting features only describes them.",pairs:[["Describe","Say what is there"],["Analyse","Explain the linked effects and why they matter"]],analysis:"Use a because/therefore link, but support it with a real observation.",evaluation:"Consider whether the same feature might help one audience but confuse another."}),
  lesson({id:"evaluation",title:"Reach a supported judgement",skill:"evaluation",
    lines:["Evaluation weighs the evidence before making a judgement.","Say which website is better for this audience and task, and why.","Include an important limitation or trade-off."],
    example:"A was easier for finding entry requirements in our test. However, we tested only one course on a laptop, so we cannot conclude that A is better on every device.",support:"Try: I judge A more suitable for… because… However, my evidence is limited by…",
    question:"Which is the strongest supported judgement?",answers:["A was easier for this tested task, but we have not checked mobile use","A is always best because I like it","Both sites have menus, so there is nothing to judge"],feedback:"A judgement needs evidence, context and a limitation. These skills support evaluative writing; a practice answer does not award a qualification grade.",pairs:[["Judgement","A conclusion supported by evidence"],["Limitation","A reason the conclusion may not apply everywhere"]],analysis:"Explain which evidence matters most for the audience rather than listing every feature.",evaluation:"Name a realistic improvement and explain why it would address the most important weakness."}),
];

export const unit6StudyBaseline: StudyQuestionKey[] = [
  choice("baseline-purpose-v1","purpose","A bus website should mainly help passengers to…",["Find routes and departure times","View the designer's favourite animation","Change the company's staffing rota","I'm not sure yet"],"The audience is passengers; the main task is finding travel information."),
  choice("baseline-usability-v1","usability","Which button label is clearest for finding a college course?",["Find a course","Things","Go somewhere","I'm not sure yet"],"A specific label helps a visitor predict what the button will do."),
  choice("baseline-access-v1","accessibility","Who might need to use a website without a mouse?",["Someone who uses a keyboard because of a disability","Only the website designer","Nobody: every visitor must use a mouse","I'm not sure yet"],"People use different input methods. A working website should not assume everyone can use a mouse."),
  choice("baseline-evidence-v1","evidence","What is the fairest way to compare two course websites?",["Try the same task on both and record what happens","Look only at which logo you prefer","Ask one designer which is best without trying them","I'm not sure yet"],"Comparable tasks and recorded observations give useful evidence for a judgement."),
];

export function studyContentFor(unitCode:string) {
  return unitCode==="6" ? {version:"u6-mini-v1",lessons:unit6StudyLessons,baseline:unit6StudyBaseline} : undefined;
}
