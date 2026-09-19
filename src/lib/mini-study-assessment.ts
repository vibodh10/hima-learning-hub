import type {StudyCompletion,StudyGrade,StudyLesson,StudyQuestionKey} from "./mini-study";

export type StudyAssessmentKind="formative"|"summative";
export type StudyAssessmentPlan={
  lessonId:string;kind:StudyAssessmentKind;number:number;cycle:number;title:string;questions:StudyQuestionKey[];
};
export type StudySkillState={skill:string;correct:number;total:number;state:"Secure"|"Developing"|"Needs reinforcement"};

// The first numbered formative assessment is deliberately scheduled for the
// teaching week beginning 21 September 2026. Formatives then repeat every two
// weeks. Summatives run in their own four-week cycle, on the intervening week,
// so Formative Assessment 1, 2, 3... remain a continuous sequence.
const firstFormativeWeek="2026-09-21";
const firstSummativeWeek="2026-10-12";
const weekDays=7;
const formativeIntervalDays=14;
const summativeIntervalDays=28;

const seededLessonIds:Record<string,string[]>={
  // Tutor-confirmed material already taught in class. Later coverage expands
  // automatically from completed Hima lessons rather than exposing future topics.
  "2":["u2-records-v1","u2-validation-v1","u2-queries-reports-v1"],
  "4":["u4-variables-v1","u4-selection-v1","u4-iteration-v1","u4-data-types-operators-v1"],
  "6":["u6-semantic-html-v1","u6-navigation-v1"],
};

export function isAssessmentLessonId(id:string){return id.startsWith("assessment:");}
export function isReinforcementLessonId(id:string){return id.startsWith("reinforce:");}

function dayNumber(day:string){return Math.floor(Date.parse(`${day}T12:00:00Z`)/86_400_000);}
function dueNumber(day:string,first:string,intervalDays:number):number|null{
  const elapsed=dayNumber(day)-dayNumber(first);
  if(elapsed<0)return null;
  const offset=elapsed%intervalDays;
  if(offset<0||offset>=weekDays)return null;
  return Math.floor(elapsed/intervalDays)+1;
}

function completedLearning(history:StudyCompletion[]){
  return history.filter(item=>item.kind==="daily"&&!isAssessmentLessonId(item.lessonId)&&!isReinforcementLessonId(item.lessonId));
}

function eligibleLessons(unitCode:string,lessons:StudyLesson[],history:StudyCompletion[]){
  const completed=completedLearning(history);
  const lessonById=new Map(lessons.map(lesson=>[lesson.id,lesson]));
  const ordered:StudyLesson[]=[];
  for(const id of seededLessonIds[unitCode]??[]){const lesson=lessonById.get(id);if(lesson)ordered.push(lesson);}
  for(const item of completed){const lesson=lessonById.get(item.lessonId);if(lesson)ordered.push(lesson);}
  const skills=new Set<string>();
  return ordered.filter(lesson=>{
    if(["analysis","evaluation"].includes(lesson.skill)||skills.has(lesson.skill))return false;
    skills.add(lesson.skill);return true;
  });
}

function planFor(kind:StudyAssessmentKind,number:number,unitCode:string,lessons:StudyLesson[],history:StudyCompletion[]):StudyAssessmentPlan|null{
  const lessonId=`assessment:u${unitCode}:${kind}:${number}`;
  if(history.some(item=>item.lessonId===lessonId))return null;
  const eligible=eligibleLessons(unitCode,lessons,history);
  const skillLimit=kind==="summative"?5:4;
  const selected=eligible.slice(0,skillLimit);
  if(selected.length<2)return null;
  const questions=selected.flatMap(lesson=>lesson.questions.slice(0,2).map(question=>({...question,recap:false})));
  if(questions.length<4)return null;
  return {lessonId,kind,number,cycle:number,title:`${kind==="summative"?"Summative":"Formative"} Assessment ${number}`,questions:questions.slice(0,10)};
}

/**
 * Formative Assessment 1 is available throughout 21-27 September 2026.
 * Formative Assessment 2 follows two weeks later, then 3, 4 and so on.
 * Summative assessments run every four weeks on a separate intervening week.
 * Only already-taught seeded topics and lessons actually completed in Hima are eligible.
 */
export function assessmentPlanFor(day:string,unitCode:string,lessons:StudyLesson[],history:StudyCompletion[]):StudyAssessmentPlan|null{
  const summativeNumber=dueNumber(day,firstSummativeWeek,summativeIntervalDays);
  if(summativeNumber){
    const summative=planFor("summative",summativeNumber,unitCode,lessons,history);
    if(summative)return summative;
  }
  const formativeNumber=dueNumber(day,firstFormativeWeek,formativeIntervalDays);
  if(formativeNumber)return planFor("formative",formativeNumber,unitCode,lessons,history);
  return null;
}

/**
 * After a check exposes a gap, Hima automatically re-teaches and re-checks the
 * first unresolved skill. A correct later check clears it. Up to three direct
 * retries are used before normal adaptive lessons continue and the teacher view
 * keeps the evidence visible for review.
 */
export function reinforcementLessonFor(lessons:StudyLesson[],history:StudyCompletion[]):StudyLesson|undefined{
  const assessment=[...history].filter(item=>item.kind==="daily"&&isAssessmentLessonId(item.lessonId)).at(-1);
  if(!assessment)return undefined;
  const missed=[...new Set(assessment.feedback.filter(item=>!item.recap&&!item.correct).map(item=>item.skill))];
  for(const skill of missed){
    const later=history.filter(item=>item.completedAt>assessment.completedAt);
    const corrected=later.some(item=>{
      const evidence=item.feedback.filter(answer=>!answer.recap&&answer.skill===skill);
      return evidence.length>0&&evidence.every(answer=>answer.correct);
    });
    if(corrected)continue;
    const slug=skill.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"skill";
    const prefix=`reinforce:${assessment.lessonId}:${slug}:`;
    const retries=later.filter(item=>item.lessonId.startsWith(prefix)).length;
    if(retries>=3)continue;
    const source=lessons.find(lesson=>lesson.skill===skill);
    if(!source)continue;
    return {...source,id:`${prefix}${retries+1}`,title:`Practice again: ${source.title}`,
      lines:["Your last assessment showed that this idea needs another check.",...source.lines],
      support:`Hima has selected this automatically from your assessment evidence. ${source.support}`};
  }
  return undefined;
}

export function assessmentSkillStates(grade:StudyGrade|null|undefined):StudySkillState[]{
  if(!grade)return [];
  const bySkill=new Map<string,{correct:number;total:number}>();
  for(const answer of grade.feedback.filter(item=>!item.recap)){
    const value=bySkill.get(answer.skill)??{correct:0,total:0};
    value.total+=1;if(answer.correct)value.correct+=1;bySkill.set(answer.skill,value);
  }
  return [...bySkill.entries()].map(([skill,value])=>{
    const rate=value.total?value.correct/value.total:0;
    return {skill,correct:value.correct,total:value.total,state:rate>=.8?"Secure":rate>=.5?"Developing":"Needs reinforcement"};
  });
}
