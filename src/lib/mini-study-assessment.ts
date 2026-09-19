import type {StudyCompletion,StudyGrade,StudyLesson,StudyQuestionKey} from "./mini-study";

export type StudyAssessmentKind="formative"|"summative";
export type StudyAssessmentWindow={kind:StudyAssessmentKind;number:number;title:string;start:string;end:string};
export type StudyAssessmentPlan={
  lessonId:string;kind:StudyAssessmentKind;number:number;cycle:number;title:string;questions:StudyQuestionKey[];
};
export type StudySkillState={skill:string;correct:number;total:number;state:"Secure"|"Developing"|"Needs reinforcement"};

// Formal checks follow the tutor's taught curriculum, not completion of the
// hub's second-practice lessons. Formative 1 is deliberately available for the full
// teaching week beginning 21 September 2026.
const firstFormativeWeek="2026-09-21";
const firstSummativeWeek="2026-10-12";
const weekDays=7;
const formativeIntervalDays=14;
const summativeIntervalDays=28;

const seededLessonIds:Record<string,string[]>={
  // Tutor-confirmed material already taught in class. Update this map as the
  // teaching sequence advances; hub lessons themselves do not unlock formal
  // assessment topics because this is the reinforcement layer, not first teaching.
  "2":["u2-records-v1","u2-validation-v1","u2-queries-reports-v1"],
  "4":["u4-variables-v1","u4-selection-v1","u4-iteration-v1","u4-data-types-operators-v1","u4-functions-basics-v1"],
  "6":["u6-html-page-basics-v1","u6-links-images-folders-v1","u6-css-methods-v1"],
};

export function isAssessmentLessonId(id:string){return id.startsWith("assessment:");}
export function isReinforcementLessonId(id:string){return id.startsWith("reinforce:");}

function dayNumber(day:string){return Math.floor(Date.parse(`${day}T12:00:00Z`)/86_400_000);}
function addDays(day:string,amount:number){const date=new Date(`${day}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+amount);return date.toISOString().slice(0,10);}
function dueNumber(day:string,first:string,intervalDays:number):number|null{
  const elapsed=dayNumber(day)-dayNumber(first);
  if(elapsed<0)return null;
  const offset=elapsed%intervalDays;
  if(offset<0||offset>=weekDays)return null;
  return Math.floor(elapsed/intervalDays)+1;
}
function windowFor(kind:StudyAssessmentKind,number:number):StudyAssessmentWindow{
  const first=kind==="formative"?firstFormativeWeek:firstSummativeWeek;
  const interval=kind==="formative"?formativeIntervalDays:summativeIntervalDays;
  const start=addDays(first,(number-1)*interval);
  return {kind,number,start,end:addDays(start,weekDays-1),title:`${kind==="formative"?"Formative":"Summative"} Assessment ${number}`};
}
function scheduledWindowsThrough(day:string):StudyAssessmentWindow[]{
  const windows:StudyAssessmentWindow[]=[];
  for(let number=1;number<=40;number++){
    for(const kind of ["formative","summative"] as const){
      const window=windowFor(kind,number);
      if(dayNumber(window.start)<=dayNumber(day))windows.push(window);
    }
  }
  return windows.sort((a,b)=>a.start.localeCompare(b.start)||a.kind.localeCompare(b.kind));
}

export function activeAssessmentWindow(day:string):StudyAssessmentWindow|null{
  const summative=dueNumber(day,firstSummativeWeek,summativeIntervalDays);
  if(summative)return windowFor("summative",summative);
  const formative=dueNumber(day,firstFormativeWeek,formativeIntervalDays);
  return formative?windowFor("formative",formative):null;
}

/** Current or future scheduled windows, used by the teacher preview. */
export function upcomingAssessmentWindows(day:string,count=4):StudyAssessmentWindow[]{
  const result:StudyAssessmentWindow[]=[];
  for(let number=1;number<=20;number++){
    for(const kind of ["formative","summative"] as const){
      const window=windowFor(kind,number);
      if(dayNumber(window.end)>=dayNumber(day))result.push(window);
    }
  }
  return result.sort((a,b)=>a.start.localeCompare(b.start)||a.kind.localeCompare(b.kind)).slice(0,count);
}

/**
 * The Digital Learning Hub is second practice. Ordinary study as well as
 * formal assessment coverage stays inside the tutor-confirmed taught pool; it
 * must not become the learner's first exposure to a future curriculum topic.
 */
export function taughtPracticeLessons(unitCode:string,lessons:StudyLesson[]){
  const lessonById=new Map(lessons.map(lesson=>[lesson.id,lesson]));
  const skills=new Set<string>();
  return (seededLessonIds[unitCode]??[]).flatMap(id=>{
    const lesson=lessonById.get(id);
    if(!lesson||["analysis","evaluation"].includes(lesson.skill)||skills.has(lesson.skill))return [];
    skills.add(lesson.skill);return [lesson];
  });
}

function planFor(window:StudyAssessmentWindow,unitCode:string,lessons:StudyLesson[],history:StudyCompletion[],ignoreCompletion=false):StudyAssessmentPlan|null{
  const lessonId=`assessment:u${unitCode}:${window.kind}:${window.number}`;
  if(!ignoreCompletion&&history.some(item=>item.lessonId===lessonId))return null;
  const eligible=taughtPracticeLessons(unitCode,lessons);
  const skillLimit=5;
  const selected=eligible.slice(0,skillLimit);
  if(selected.length<2)return null;
  const questions=selected.flatMap(lesson=>lesson.questions.slice(0,2).map(question=>({...question,recap:false})));
  if(questions.length<4)return null;
  return {lessonId,kind:window.kind,number:window.number,cycle:window.number,title:window.title,questions:questions.slice(0,10)};
}

/** Exact teacher-only preview of a scheduled assessment. */
export function assessmentPreviewPlan(window:StudyAssessmentWindow,unitCode:string,lessons:StudyLesson[]):StudyAssessmentPlan|null{
  return planFor(window,unitCode,lessons,[],true);
}

/**
 * The oldest scheduled formal assessment that has not been completed remains
 * compulsory even after its original assessment week has ended. Newer checks
 * cannot silently replace a missed Formative/Summative Assessment.
 */
export function assessmentPlanFor(day:string,unitCode:string,lessons:StudyLesson[],history:StudyCompletion[]):StudyAssessmentPlan|null{
  for(const window of scheduledWindowsThrough(day)){
    const plan=planFor(window,unitCode,lessons,history);
    if(plan)return plan;
  }
  return null;
}

/**
 * After a check exposes a gap, the hub automatically re-teaches and re-checks
 * the first unresolved skill. A correct later check clears it. Up to three direct
 * retries are used before normal adaptive lessons continue and the teacher view
 * keeps the evidence visible for review.
 */
export function reinforcementLessonFor(lessons:StudyLesson[],history:StudyCompletion[]):StudyLesson|undefined{
  const assessment=[...history].filter(item=>item.kind==="daily"&&isAssessmentLessonId(item.lessonId)).at(-1);
  if(!assessment)return undefined;
  const missedFeedback=assessment.feedback.filter(item=>!item.recap&&!item.correct);
  const missed=[...new Set(missedFeedback.map(item=>item.skill))];
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
    const missedQuestionIds=new Set(missedFeedback.filter(item=>item.skill===skill).map(item=>item.questionId));
    const source=lessons.find(lesson=>lesson.skill===skill&&lesson.questions.some(question=>missedQuestionIds.has(question.id)))
      ??lessons.find(lesson=>lesson.skill===skill);
    if(!source)continue;
    return {...source,id:`${prefix}${retries+1}`,title:`Practice again: ${source.title}`,
      lines:["Your last assessment showed that this idea needs another check.",...source.lines],
      support:`This practice was selected automatically from your assessment evidence. ${source.support}`};
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
