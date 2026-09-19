import type { StudyGrade } from "./mini-study";
import {assessmentSkillStates} from "./mini-study-assessment";

export type StudyUnitRef={id:string;label:string};
export type StudyLegacyBaseline={learner_id:string;unit_id?:string;correct_count:number;question_count:number;completed_at:string};
export type StudyIntegrityEvent={session_id:string;event_type:"fullscreen_exit"|"tab_hidden"|"fullscreen_return";occurred_at:string};
export type StudyPracticeMiss={id:string;learner_id:string;class_id:string;unit_id:string|null;missed_on:string;learner_notified_at:string|null;teacher_notified_at:string|null;created_at:string};
export type StudyIntervention={id:string;learner_id:string;class_id:string;kind:string;status:string;evidence:unknown;note:string|null;created_at:string;resolved_at:string|null};
export type MiniStudyRecord={id:string;learner_id:string;unit_id?:string;lesson_id?:string;kind:"baseline"|"daily";status:string;content:{title?:string;assessmentKind?:"formative"|"summative";assessmentNumber?:number};grade:StudyGrade|null;target_text:string|null;needs_help:boolean;checked_at:string|null;completed_at:string|null};

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

function assessmentEvidence(records:MiniStudyRecord[]){
  const checked=records.filter(row=>row.grade&&row.status!=="abandoned").sort((a,b)=>(b.checked_at??"").localeCompare(a.checked_at??""));
  const latest=checked.find(row=>row.kind==="daily"&&Boolean(row.content.assessmentKind));
  const formatives=checked.filter(row=>row.kind==="daily"&&row.content.assessmentKind==="formative"&&row.grade)
    .sort((a,b)=>(a.content.assessmentNumber??0)-(b.content.assessmentNumber??0)||(a.checked_at??"").localeCompare(b.checked_at??""));
  const previousFormative=formatives.length>1?formatives[formatives.length-2]:null;
  const latestFormative=formatives.at(-1)??null;
  const formativeProgress=latestFormative?{
    from:previousFormative?{number:previousFormative.content.assessmentNumber,correct:previousFormative.grade!.correct,total:previousFormative.grade!.total}:null,
    to:{number:latestFormative.content.assessmentNumber,correct:latestFormative.grade!.correct,total:latestFormative.grade!.total},
    percentagePointChange:previousFormative
      ? Math.round((((latestFormative.grade!.total?latestFormative.grade!.correct/latestFormative.grade!.total:0)-(previousFormative.grade!.total?previousFormative.grade!.correct/previousFormative.grade!.total:0))*100)*10)/10
      : null,
  }:null;
  const sevenDaysAgo=Date.now()-7*24*60*60*1000;
  const warnings=checked.filter(row=>{
    if(row.kind!=="daily"||!row.grade||!row.checked_at)return false;
    const rate=row.grade.total?row.grade.correct/row.grade.total:0;
    return Date.parse(row.checked_at)>=sevenDaysAgo&&rate<.5;
  }).length;
  return {
    latest:latest?{
      sessionId:latest.id,title:latest.content.title??"Assessment",kind:latest.content.assessmentKind!,number:latest.content.assessmentNumber,
      checkedAt:latest.checked_at,grade:latest.grade!,skills:assessmentSkillStates(latest.grade),
    }:null,
    formativeProgress,
    warningCount:warnings,
    teacherReviewRequired:warnings>=3,
  };
}

/** Summarises records that already belong to one learner and one unit. */
export function miniStudyLearnerSummary(records:MiniStudyRecord[]) {
  const checked=records.filter(r=>r.grade && r.status!=="abandoned").sort((a,b)=>(b.checked_at??"").localeCompare(a.checked_at??""));
  const baseline=checked.find(r=>r.kind==="baseline");
  const latest=checked.find(r=>r.kind==="daily");
  const lastEvidence=latest??baseline;
  const recap=latest?.grade?.feedback.filter(f=>f.recap)??[];
  const baselineGrade=baseline?.grade??null;
  const assessment=assessmentEvidence(records);
  const assessmentNeedsHelp=Boolean(assessment.latest?.skills.some(skill=>skill.state==="Needs reinforcement"));
  const needsHelp=(lastEvidence?.needs_help??false)||assessmentNeedsHelp;
  return {
    baseline:baselineGrade,
    latest:latest?{title:latest.content.title??"Short self-study",grade:latest.grade!,checkedAt:latest.checked_at,finished:latest.status==="completed"}:null,
    recap:recap.length?{correct:recap.filter(r=>r.correct).length,total:recap.length}:null,
    completedSteps:records.filter(r=>r.kind==="daily" && r.status==="completed").length,
    practiceLevel:practiceLevel(records,baselineGrade),
    assessment,
    needsHelp,
    supportReason:lastEvidence?.needs_help&&lastEvidence.grade
      ? `${lastEvidence.kind==="baseline"?"Starting point":lastEvidence.content.title??"Latest short lesson"}: ${lastEvidence.grade.correct} of ${lastEvidence.grade.total} new first answers correct. ${lastEvidence.status==="completed"?"The step is completed. Automatic reinforcement will continue from this evidence.":"Feedback review is not yet finished."}`
      :assessmentNeedsHelp?"The latest automated assessment contains one or more skills marked Needs reinforcement. The SCCB Digital Learning Hub will reteach and recheck those skills automatically.":null,
    target:lastEvidence?.target_text??"Continue with the next automatic short step; support and stretch are selected from the learner's saved evidence.",
  };
}
