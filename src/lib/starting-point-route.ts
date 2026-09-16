import type {StudyGrade} from "./mini-study";
export function startingPointRoute(grade:StudyGrade){
 const timedOut=grade.feedback.filter(f=>f.selectedAnswer?.startsWith("Time expired")).length;
 if(timedOut)return `Needs another check · ${timedOut} timed out (not evidence of a missing skill)`;
 return grade.correct<5?"Required skills · support first":grade.correct<8?"Core · build confidence":"Stretch · extend your reasoning";
}
