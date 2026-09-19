import type {StudyCompletion,StudyGrade,StudyLesson,StudyQuestionKey} from "./mini-study";

export type StudyAssessmentKind="formative"|"summative";
export type StudyAssessmentPlan={
  lessonId:string;kind:StudyAssessmentKind;number:number;cycle:number;title:string;questions:StudyQuestionKey[];
};
export type StudySkillState={skill:string;correct:number;total:number;state:"Secure"|"Developing"|"Needs reinforcement"};

const academicStart="2026-08-31";
const seededLessonIds:Record<string,string[]>={
  // These are the topics the tutor has confirmed as already taught. Future
  // assessment coverage expands automatically as Hima records completed lessons.
  "2":["u2-records-v1","u2-validation-v1","u2-queries-reports-v1"],
  "4":["u4-variables-v1","u4-data-types-operators-v1","u4-iteration-v1"],
  "6":["u6-semantic-html-v1","u6-navigation-v1"],
};

export function isAssessmentLessonId(id:string){return id.startsWith("assessment:");}
export function isReinforcementLessonId(id:string){return id.startsWith("reinforce:");}

function dayNumber(day:string){return Math.floor(Date.parse(`${day}T12:00:00Z`)/86_400_000);}
function assessmentCycle(day:string){return Math.floor((dayNumber(day)-dayNumber(academicStart))/14);}

function completedLearning(history:StudyCompletion[]){
  return history.filter(item=>item.kind==="daily"&&!isAssessmentLessonId(item.lessonId)&&!isReinforcementLessonId(item.lessonId));
}

function eligibleLessons(unitCode:string,lessons:StudyLesson[],history:StudyCompletion[]){
  const completed=completedLearning(history);
  if(completed.length<2)return [];
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

/**
 * A formative check becomes due every two teaching weeks. Every second cycle is
 * a cumulative summative check instead, so a learner never receives two formal
 * checks in the same fortnight. Late joiners receive only the current cycle.
 */
export function assessmentPlanFor(day:string,unitCode:string,lessons:StudyLesson[],history:StudyCompletion[]):StudyAssessmentPlan|null{
  const cycle=assessmentCycle(day);
  if(cycle<1)return null;
  const kind:StudyAssessmentKind=cycle%2===0?"summative":"formative";
  const number=Math.ceil(cycle/2);
  const lessonId=`assessment:u${unitCode}:${kind}:${number}:c${cycle}`;
  if(history.some(item=>item.lessonId===lessonId))return null;
  const eligible=eligibleLessons(unitCode,lessons,history);
  const skillLimit=kind==="summative"?5:3;
  const selected=eligible.slice(0,skillLimit);
  if(selected.length<2)return null;
  const questions=selected.flatMap(lesson=>lesson.questions.slice(0,2).map(question=>({...question,recap:false})));
  if(questions.length<2)return null;
  return {lessonId,kind,number,cycle,title:`${kind==="summative"?"Summative":"Formative"} Assessment ${number}`,questions:questions.slice(0,10)};
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
