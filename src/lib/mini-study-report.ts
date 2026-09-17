import type { StudyGrade } from "./mini-study";

export type StudyUnitRef={id:string;label:string};
export type StudyLegacyBaseline={learner_id:string;unit_id?:string;correct_count:number;question_count:number;completed_at:string};
export type MiniStudyRecord={id:string;learner_id:string;unit_id?:string;kind:"baseline"|"daily";status:string;content:{title?:string};grade:StudyGrade|null;target_text:string|null;needs_help:boolean;checked_at:string|null;completed_at:string|null};

function practiceLevel(records:MiniStudyRecord[],baseline:StudyGrade|null) {
  const recent=records.filter(r=>r.kind==="daily"&&r.status==="completed"&&r.grade)
    .sort((a,b)=>(b.completed_at??b.checked_at??"").localeCompare(a.completed_at??a.checked_at??""))
    .slice(0,3);
  if(!recent.length) {
    if(!baseline)return "Not enough evidence yet";
    const rate=baseline.total?baseline.correct/baseline.total:0;
    return rate>=.8?"Strong starting point":rate>=.5?"Developing from starting point":"Building foundations";
  }
  const correct=recent.reduce((sum,row)=>sum+(row.grade?.correct??0),0);
  const total=recent.reduce((sum,row)=>sum+(row.grade?.total??0),0);
  const rate=total?correct/total:0;
  if(recent.length>=2&&rate>=.85)return "Stretch-ready on recent practice";
  if(rate>=.7)return "Secure on recent practice";
  if(rate>=.5)return "Developing on recent practice";
  return "Building foundations";
}

/** Summarises records that already belong to one learner and one unit. */
export function miniStudyLearnerSummary(records:MiniStudyRecord[]) {
  const checked=records.filter(r=>r.grade && r.status!=="abandoned").sort((a,b)=>(b.checked_at??"").localeCompare(a.checked_at??""));
  const baseline=checked.find(r=>r.kind==="baseline");
  const latest=checked.find(r=>r.kind==="daily");
  const lastEvidence=latest??baseline;
  const recap=latest?.grade?.feedback.filter(f=>f.recap)??[];
  const baselineGrade=baseline?.grade??null;
  return {
    baseline:baselineGrade,
    latest:latest?{title:latest.content.title??"Short self-study",grade:latest.grade!,checkedAt:latest.checked_at,finished:latest.status==="completed"}:null,
    recap:recap.length?{correct:recap.filter(r=>r.correct).length,total:recap.length}:null,
    completedSteps:records.filter(r=>r.kind==="daily" && r.status==="completed").length,
    practiceLevel:practiceLevel(records,baselineGrade),
    needsHelp:lastEvidence?.needs_help??false,
    supportReason:lastEvidence?.needs_help&&lastEvidence.grade
      ? `${lastEvidence.kind==="baseline"?"Starting point":lastEvidence.content.title??"Latest short lesson"}: ${lastEvidence.grade.correct} of ${lastEvidence.grade.total} new first answers correct. ${lastEvidence.status==="completed"?"The step is completed. Automatic reinforcement will continue from this evidence.":"Feedback review is not yet finished."}`
      :null,
    target:lastEvidence?.target_text??"Continue with the next automatic short step; support and stretch are selected from the learner's saved evidence.",
  };
}
