import {assessmentSkillStates} from "./mini-study-assessment";
import type {MiniStudyRecord} from "./mini-study-report";

export type FormativeReportEntry={
  sessionId:string;
  number:number;
  title:string;
  checkedAt:string|null;
  correct:number;
  total:number;
  percentage:number;
  whatWentWell:string[];
  needsImprovement:string[];
  targetAreas:string[];
  practice:string[];
  feedback:string;
  originalWork:{question:string;answer:string;correct:boolean;expected:string;feedback:string;skill:string}[];
};
export type FormativeProgress={
  fromNumber:number;
  toNumber:number;
  fromPercentage:number;
  toPercentage:number;
  percentagePointChange:number;
  improvedSkills:string[];
  stillToImprove:string[];
};

const displaySkill=(value:string)=>value.replaceAll("-"," ").replaceAll("_"," ");
const rate=(correct:number,total:number)=>total?Math.round(correct/total*1000)/10:0;
const rank=(state:string)=>state==="Secure"?2:state==="Developing"?1:0;

export function buildFormativeAssessmentReport(records:MiniStudyRecord[]):{assessments:FormativeReportEntry[];progress:FormativeProgress[]} {
  const formatives=records.filter(record=>record.status!=="abandoned"&&record.grade&&record.content.assessmentKind==="formative")
    .sort((a,b)=>(a.content.assessmentNumber??0)-(b.content.assessmentNumber??0)||(a.checked_at??"").localeCompare(b.checked_at??""));
  const assessments=formatives.map(record=>{
    const grade=record.grade!;
    const states=assessmentSkillStates(grade);
    const secure=states.filter(item=>item.state==="Secure");
    const improvement=states.filter(item=>item.state!=="Secure");
    const linkedPractice=record.lesson_id?records.filter(item=>item.lesson_id?.startsWith(`reinforce:${record.lesson_id}:`)):[];
    const whatWentWell=secure.length
      ? secure.map(item=>`${displaySkill(item.skill)} was secure (${item.correct}/${item.total}).`)
      : grade.correct>0?[`${grade.correct} of ${grade.total} assessment answers were correct, but no assessed skill is secure yet.`]
      : ["No assessed skill is secure yet; the original responses below show the exact starting evidence for follow-up."];
    const needsImprovement=improvement.length
      ? improvement.map(item=>`${displaySkill(item.skill)} is ${item.state.toLowerCase()} (${item.correct}/${item.total}).`)
      : ["No immediate skill gap was identified in this formative assessment."];
    const targetAreas=improvement.map(item=>displaySkill(item.skill));
    const practice=linkedPractice.length
      ? linkedPractice.map(item=>`${item.content.title??"Automatic reinforcement"} · ${item.status==="completed"?"completed":"in progress"}`)
      : targetAreas.length?targetAreas.map(skill=>`Automatic second practice and recheck: ${skill}`):["Continue normal Hima second practice on taught topics."];
    return {
      sessionId:record.id,
      number:record.content.assessmentNumber??0,
      title:record.content.title??`Formative Assessment ${record.content.assessmentNumber??""}`.trim(),
      checkedAt:record.checked_at,
      correct:grade.correct,total:grade.total,percentage:rate(grade.correct,grade.total),
      whatWentWell,needsImprovement,targetAreas,practice,
      feedback:`${grade.correct} of ${grade.total} answers were correct (${rate(grade.correct,grade.total)}%). ${targetAreas.length?`Hima has identified ${targetAreas.join(", ")} for automatic practice and rechecking.`:"The assessed skills were secure enough to continue with normal second practice."}`,
      originalWork:grade.feedback.filter(answer=>!answer.recap).map(answer=>({
        question:answer.prompt??displaySkill(answer.skill),answer:answer.selectedAnswer??"Not saved in this older record",correct:answer.correct,
        expected:answer.correctAnswer,feedback:answer.explanation,skill:displaySkill(answer.skill),
      })),
    } satisfies FormativeReportEntry;
  });
  const progress:FormativeProgress[]=[];
  for(let index=1;index<formatives.length;index++){
    const before=formatives[index-1],after=formatives[index];
    const beforeStates=new Map(assessmentSkillStates(before.grade!).map(item=>[item.skill,item]));
    const afterStates=assessmentSkillStates(after.grade!);
    const improvedSkills=afterStates.filter(item=>beforeStates.has(item.skill)&&rank(item.state)>rank(beforeStates.get(item.skill)!.state)).map(item=>displaySkill(item.skill));
    const stillToImprove=afterStates.filter(item=>item.state!=="Secure").map(item=>displaySkill(item.skill));
    const fromPercentage=rate(before.grade!.correct,before.grade!.total),toPercentage=rate(after.grade!.correct,after.grade!.total);
    progress.push({
      fromNumber:before.content.assessmentNumber??index,toNumber:after.content.assessmentNumber??index+1,
      fromPercentage,toPercentage,percentagePointChange:Math.round((toPercentage-fromPercentage)*10)/10,
      improvedSkills,stillToImprove,
    });
  }
  return {assessments,progress};
}
