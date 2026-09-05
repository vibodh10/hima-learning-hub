import {lessonFor,type ExpertiseLevel} from "./learning-catalog";
import type {PearsonTopic,PearsonUnit} from "./pearson-curriculum";

export type TeachingPoint={concept:string;explanation:string;example:string};
export type TeachingCard={id:string;title:string;purpose:string;points:TeachingPoint[];workedSteps?:string[];misconception:string;checkQuestion:string;checkAnswer:string};

export function teachingSequenceFor(unit:PearsonUnit,topic:PearsonTopic,level:ExpertiseLevel):TeachingCard[]{
 const lesson=lessonFor(unit,topic,level),groups=chunk(topic.content,2);
 const conceptCards=groups.map((concepts,index):TeachingCard=>({
  id:`concept-${index+1}`,title:`Key ideas ${index*2+1} to ${Math.min(index*2+concepts.length,topic.content.length)}`,
  purpose:`Understand ${concepts.join(" and ")} before applying them.`,
  points:concepts.map(concept=>({concept,explanation:explainConcept(concept,unit.code,topic.title,level),example:conceptExample(concept,unit.code)})),
  misconception:`Do not earn marks by listing “${concepts[0]}” alone. Define it accurately, apply it to the named organisation and explain the resulting effect.`,
  checkQuestion:`How would you distinguish or connect ${concepts.join(" and ")} in a new vocational scenario?`,
  checkAnswer:concepts.map(concept=>`${concept}: ${shortDefinition(concept,unit.code)}`).join(" "),
 }));
 const goal=topic.phases.find(phase=>phase.label==="Assignment goal")?.detail??`Apply ${topic.title} accurately in assessment evidence.`;
 return [
  {id:"orientation",title:"The big idea",purpose:`Understand why ${topic.title.toLowerCase()} matters in Unit ${unit.code}.`,points:[{concept:topic.title,explanation:`This topic is assessed through ${unit.assessment.toLowerCase()} You need to move from accurate knowledge to decisions that fit a named user, organisation or technical constraint.`,example:lesson.example.scenario}],misconception:"Treating the topic as a list of definitions instead of a connected decision-making process.",checkQuestion:`What must a strong response about ${topic.title.toLowerCase()} do beyond recalling facts?`,checkAnswer:"It must apply accurate knowledge to the context, develop the effect of a decision and support the conclusion with evidence or a success check."},
  ...conceptCards,
  {id:"worked",title:"Worked vocational example",purpose:"See how a requirement becomes a justified technical decision.",points:[{concept:"Scenario",explanation:`${lesson.example.scenario} Read the scenario as evidence: identify the named user, purpose, constraint and success condition before choosing any technical feature.`,example:lesson.example.result}],workedSteps:lesson.example.steps,misconception:lesson.mistakes[0],checkQuestion:"What makes the final step a justification rather than an unsupported opinion?",checkAnswer:"It links the chosen decision back to the original requirement and uses a test, result, constraint or comparison as evidence."},
  {id:"assessment",title:unit.code==="1"||unit.code==="2"||unit.code==="14"?"Assessment technique":"Assignment evidence",purpose:goal,points:[{concept:"Command words",explanation:assessmentTechnique(unit.code),example:`For ${topic.title}, an Explain answer develops why or how; an Analyse answer builds linked consequences; an Evaluate answer weighs evidence before reaching a judgement.`}],misconception:"Writing everything known about the topic without following the command word or using the supplied context.",checkQuestion:"What should appear in the conclusion of a higher-mark response?",checkAnswer:"A supported judgement that answers the exact question, follows from the evidence and, where relevant, prioritises the best option or improvement."},
 ];
}

function explainConcept(concept:string,unitCode:string,topicTitle:string,level:ExpertiseLevel){
 const base=shortDefinition(concept,unitCode),depth=level==="Support"?" First identify it, then say what it changes for the user or system.":level==="Challenge"?" At Challenge level, compare an alternative and evaluate the trade-off using evidence.":" Link the choice to a requirement and develop its consequence.";
 return `${base}${depth} In ${topicTitle.toLowerCase()}, use the term precisely rather than as a general buzzword.`;
}

function shortDefinition(concept:string,unitCode:string){
 const value=concept.toLowerCase();
 if(unitCode==="19")return `${concept} is one part of an Internet of Things system. Explain how it connects sensing, processing, communication, data, output and the intended user need, then judge the choice against reliability, power, interoperability, security, privacy and measurable success criteria.`;
 if(/normalis|\b1nf\b|\b2nf\b|\b3nf\b|anomal/.test(value))return `${concept} controls how data is separated into related tables so each fact is stored once, dependencies are correct and insert, update or deletion anomalies are reduced.`;
 if(/primary|foreign|candidate|composite|referential|relationship|cardinality|entity|attribute|tuple|domain/.test(value))return `${concept} describes the structure and links in a relational model: identifiers must be unique, references must resolve to valid records and the permitted number of related records must match the business rule.`;
 if(/sql|quer|insert|update|delete|join|union|intersect|crud/.test(value))return `${concept} is used to define, retrieve or change data deliberately; criteria, joins and permissions must return the required result without damaging integrity or exposing unauthorised data.`;
 if(/test|typical|normal,|erroneous|extreme|validation|verification|debug|defect/.test(value))return `${concept} provides planned evidence about whether a product behaves as required. Inputs, expected outcomes, actual outcomes, corrective action and retesting must be recorded rather than simply stating that it works.`;
 if(/network|\blan\b|\bwan\b|\bvpn\b|protocol|transmission|bandwidth|connection|server|client-side|cache/.test(value))return `${concept} affects how data or processing moves between devices. Suitability depends on capacity, latency, reliability, security, compatibility and the users' location or device.`;
 if(/security|threat|protect|backup|recovery|integrity|privacy|data protection|legal|ethical|copyright|access/.test(value))return `${concept} reduces a named risk or meets a responsibility. A complete explanation identifies the asset or person at risk, the control, how it works and the residual limitation.`;
 if(/device|peripheral|hardware|processor|computer technology/.test(value))return `${concept} is selected by matching technical capability to the user's task, environment, accessibility needs, performance requirement, budget and support constraints.`;
 if(/operating system|utility|application software|open source|closed source|emerging technolog|cloud|online|collaboration/.test(value))return `${concept} provides a defined service or capability. Its value must be judged against compatibility, cost, control, support, security, scalability and consequences for users.`;
 if(/decomposition|pattern recognition|abstraction|algorithm|flowchart|pseudocode|computational/.test(value))return `${concept} turns a complex problem into a precise solution model by identifying essential inputs, processes, decisions, repetitions, outputs and reusable patterns before coding begins.`;
 if(/variable|constant|data type|selection|iteration|repetition|function|procedure|parameter|array|boolean|logic|subroutine/.test(value))return `${concept} controls how a program stores data or executes behaviour. Correct scope, type, condition and flow are essential for predictable, maintainable results.`;
 if(/programming language|procedural|object-oriented|event-driven|machine|markup|development environment|libraries|routine/.test(value))return `${concept} shapes how a solution is expressed and maintained. Selection depends on the target platform, problem type, available tools, performance, developer expertise and future change.`;
 if(/life cycle|requirements|design specification|implementation|maintenance|refinement|optimis|quality|maintainability|portability|reliability|robustness|usability/.test(value))return `${concept} is a quality or development decision that connects requirements to design, implementation, evidence and later improvement; it must be judged using observable criteria.`;
 if(/html|semantic|css|box model|typography|responsive|website|web page|navigation|anchor|form|w3c|browser|seo|indexing|keyword|crawling/.test(value))return `${concept} affects a website's structure, presentation, findability or interaction. Good use preserves semantic meaning, accessibility, responsive behaviour, standards compliance and a clear user journey.`;
 if(/javascript|script|event|method|alert|confirmation|rollover/.test(value)&&unitCode==="6")return `${concept} adds browser-side behaviour in response to a user or page event. The script must use valid logic, provide feedback, handle invalid input and remain usable when interaction fails.`;
 if(/game|player|genre|platform|engine|physics|collision|sprite|asset|animation|audio|state|level|mechanic|difficulty|frame/.test(value)||unitCode==="8")return `${concept} affects the player's experience or the technical game loop. It must be selected and tuned for the audience, platform, controls, performance target and intended mechanic, then tested through play evidence.`;
 if(/project|methodolog|agile|waterfall|prince|initiation|business case|feasibility|stakeholder|risk|issue|change|milestone|resource|budget|gantt|critical path|monitor|closure|handover|lesson/.test(value)||unitCode==="9")return `${concept} is a project-control decision or record. It clarifies ownership, feasibility, sequence, cost, uncertainty or progress so stakeholders can act on evidence rather than assumption.`;
 if(/analytics|big data|qualitative|quantitative|warehouse|data mart|olap|descriptive|diagnostic|predictive|prescriptive|mean|median|mode|variance|deviation|distribution|t-test|regression|correlation|dataset/.test(value)||unitCode==="10")return `${concept} turns organisational data into evidence for a defined decision. The method, software, data quality and interpretation must be appropriate, reproducible and linked to the original question rather than treated as a calculation without context.`;
 if(/service|catalogue|infrastructure|sla|incident|asset|jurisdiction|organisation|strategic|operational|customer/.test(value)||unitCode==="14")return `${concept} is part of defining, designing or managing an IT service. It must be traced to organisational aims and user needs, compared with alternatives, and justified using cost, risk, security, continuity, implementation and measurable service outcomes.`;
 if(/audience|purpose|requirement|constraint|feedback|professional|accountability|communication|self-management/.test(value))return `${concept} ensures the solution and the development process remain aligned with the people, purpose, constraints and professional standards in the brief.`;
 return `${concept} is a required decision area. Define what it controls, show how it operates in the named context and judge its effect using a requirement, constraint or measurable result.`;
}

function conceptExample(concept:string,unitCode:string){
 const value=concept.toLowerCase();
 if(/normalis|\b3nf\b/.test(value))return "An invoice line is separated from customer and product data; changing one product price no longer requires editing many invoice records.";
 if(/foreign|referential/.test(value))return "An Order record may use CustomerID as a foreign key; referential integrity prevents an order from pointing to a customer that does not exist.";
 if(/sql|quer|join/.test(value))return "A parameterised query joins Customers and Orders to show overdue balances while a role restricts who may update payment data.";
 if(/test|erroneous|extreme/.test(value))return "A form is tested with a valid boundary value, an invalid text value and the largest permitted input; failures are fixed and the same tests are repeated.";
 if(/network|vpn|bandwidth/.test(value))return "Remote staff use an encrypted VPN, but video performance is checked at peak time because security alone does not guarantee usable bandwidth.";
 if(/security|backup|threat/.test(value))return "Multi-factor authentication reduces account takeover risk, while an offline tested backup addresses recovery if ransomware still succeeds.";
 if(/decomposition|algorithm|pseudocode/.test(value))return "A booking problem is split into availability, validation, price calculation, confirmation and storage before each part is represented in pseudocode.";
 if(/variable|selection|iteration|function/.test(value))return "A validation function receives an age parameter, uses selection to reject invalid values and returns a Boolean used by the main program.";
 if(/html|semantic/.test(value))return "A page uses nav, main, headings and labelled form controls so keyboard and assistive-technology users can understand its structure.";
 if(/css|responsive|box model/.test(value))return "A mobile-first grid changes columns at a tested breakpoint while spacing and focus indicators remain readable at 200% zoom.";
 if(/javascript|script|event/.test(value)&&unitCode==="6")return "A submit event validates required fields, places an accessible error beside each problem and prevents submission only until errors are corrected.";
 if(unitCode==="19")return `A room sensor records ${concept}, a controller validates and processes the reading, and the secured service stores the result before sending an alert or control instruction that can be tested against the requirement.`;
 if(unitCode==="8")return "A player test shows repeated failure at level two, so the collision window and feedback are adjusted and retested without removing the intended challenge.";
 if(unitCode==="9")return "A risk register records probability, impact, owner, mitigation and review date; the project manager escalates it when the trigger occurs.";
 return `A team records a requirement involving ${concept}, implements a suitable choice, then compares the measured result with the agreed success criterion.`;
}

function assessmentTechnique(unitCode:string){
 if(unitCode==="1")return "For the written examination, identify the command word, underline the context and allocate time by marks. Extend each point with a because/therefore link and finish evaluative questions with a contextual judgement.";
 if(unitCode==="2")return "For the set task, keep a traceable chain from requirements to relational design, implementation, testing and evaluation. Screenshots or outputs need annotations that explain what the evidence proves.";
 if(unitCode==="14")return "For the external set task, analyse the organisation's evidence before designing. Keep every service requirement traceable to the proposed information, data, hardware, software and management decisions; compare alternatives and justify the final solution. Practice materials must never be presented as Pearson's live task.";
 return "For internal assessment, keep authentic dated evidence of research, design decisions, development, testing, feedback, refinement and evaluation. A polished final product without the decision trail cannot demonstrate the full criteria.";
}
function chunk<T>(values:T[],size:number){return Array.from({length:Math.ceil(values.length/size)},(_,index)=>values.slice(index*size,index*size+size));}
