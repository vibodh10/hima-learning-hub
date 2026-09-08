import type { StudyGrade } from "./mini-study";

export type MiniStudyRecord={id:string;learner_id:string;kind:"baseline"|"daily";status:string;content:{title?:string};grade:StudyGrade|null;target_text:string|null;needs_help:boolean;checked_at:string|null;completed_at:string|null};
export function miniStudyLearnerSummary(records:MiniStudyRecord[]) {
  const checked=records.filter(r=>r.grade && r.status!=="abandoned").sort((a,b)=>(b.checked_at??"").localeCompare(a.checked_at??""));
  const baseline=checked.find(r=>r.kind==="baseline");
  const latest=checked.find(r=>r.kind==="daily");
  const lastEvidence=latest??baseline;
  const recap=latest?.grade?.feedback.filter(f=>f.recap)??[];
  return {
    baseline:baseline?.grade??null,
    latest:latest?{title:latest.content.title??"Short self-study",grade:latest.grade!,checkedAt:latest.checked_at,finished:latest.status==="completed"}:null,
    recap:recap.length?{correct:recap.filter(r=>r.correct).length,total:recap.length}:null,
    completedSteps:records.filter(r=>r.kind==="daily" && r.status==="completed").length,
    needsHelp:lastEvidence?.needs_help??false,
    target:lastEvidence?.target_text??"Complete the next assigned short step so support can be selected from evidence.",
  };
}
