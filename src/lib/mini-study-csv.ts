import {miniStudyLearnerSummary,type MiniStudyRecord,type StudyLegacyBaseline,type StudyUnitRef} from "./mini-study-report";

const legacyUnit="__legacy__";
const evidenceUnit=(row:{unit_id?:string})=>row.unit_id??legacyUnit;

function cell(value:unknown){
  let text=String(value??"");
  // Names can be user supplied. Quoting alone does not prevent spreadsheet formulas.
  if(/^[\s\uFEFF]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text))text=`'${text}`;
  return `"${text.replaceAll('"','""')}"`;
}

function reportUnits(records:MiniStudyRecord[],baselines:StudyLegacyBaseline[],units:StudyUnitRef[]):StudyUnitRef[]{
  if(units.length)return units;
  const ids=[...new Set([...records.map(evidenceUnit),...baselines.map(evidenceUnit)])];
  return (ids.length?ids:[legacyUnit]).map(id=>({id,label:id===legacyUnit?"Current unit":`Unit ${id}`}));
}

/** Exports one current summary per learner and per unit so unlike instruments are never combined. */
export function miniStudyCsv(group:string,learners:{id:string;name:string}[],records:MiniStudyRecord[],baselines:StudyLegacyBaseline[],units:StudyUnitRef[]=[]){
  const unitRefs=reportUnits(records,baselines,units);
  const unitLabel=new Map(unitRefs.map(unit=>[unit.id,unit.label]));
  const rows:unknown[][]=[
    ["Automated self-study and assessment evidence. Learning warnings identify repeated low first-attempt checks; they do not establish a behaviour cause."],
    ["Group","Student","Unit","Record type","Step","Checked at (UTC)","Correct (new learning)","Total (new learning)","Recap correct","Recap total","Completed daily steps","Starting point","Current expertise","Latest assessment","Assessment skill states","Learning warnings (7 days)","Teacher review required","Status","Automatic target","Question","First answer","Expected answer","Answer result"],
  ];
  for(const learner of learners){
    for(const unit of unitRefs){
      const own=records.filter(r=>r.learner_id===learner.id&&r.status!=="abandoned"&&evidenceUnit(r)===unit.id);
      const summary=miniStudyLearnerSummary(own);
      const legacy=baselines.find(b=>b.learner_id===learner.id&&evidenceUnit(b)===unit.id);
      const startingPoint=summary.baseline?`${summary.baseline.correct} of ${summary.baseline.total}`:legacy?`${legacy.correct_count} of ${legacy.question_count}`:"Not recorded";
      const assessment=summary.assessment.latest;
      const skillStates=assessment?.skills.map(skill=>`${skill.skill}: ${skill.state} (${skill.correct}/${skill.total})`).join("; ")??"Not assessed yet";
      rows.push([group,learner.name,unit.label,"Current summary",summary.latest?.title??"No daily check recorded",summary.latest?.checkedAt,
        summary.latest?.grade.correct,summary.latest?.grade.total,summary.recap?.correct,summary.recap?.total,summary.completedSteps,
        startingPoint,summary.practiceLevel,assessment?`${assessment.title}: ${assessment.grade.correct}/${assessment.grade.total}`:"Not assessed yet",skillStates,
        summary.assessment.warningCount,summary.assessment.teacherReviewRequired?"Yes":"No",
        summary.assessment.teacherReviewRequired?"Teacher review required":summary.needsHelp?"Automatic reinforcement active":summary.latest?"Learning recorded":"Starting point or next step pending",summary.target]);
      if(legacy)rows.push([group,learner.name,unit.label,"Existing full-unit starting point","Preserved full-unit assessment",legacy.completed_at,legacy.correct_count,legacy.question_count,"","","",`${legacy.correct_count} of ${legacy.question_count}`,summary.practiceLevel,"","","","","Completed"]);
    }
    const own=records.filter(r=>r.learner_id===learner.id&&r.status!=="abandoned"&&r.grade)
      .sort((a,b)=>(a.checked_at??"").localeCompare(b.checked_at??""));
    for(const record of own){
      const grade=record.grade!;
      const recap=grade.feedback.filter(f=>f.recap);
      const label=unitLabel.get(evidenceUnit(record))??"Current unit";
      const recordType=record.kind==="baseline"?"Short starting point":record.content.assessmentKind?`${record.content.assessmentKind==="summative"?"Summative":"Formative"} assessment`:"Daily step";
      for(const answer of grade.feedback)rows.push([group,learner.name,label,recordType,record.content.title,record.checked_at,
        grade.correct,grade.total,recap.length?recap.filter(f=>f.correct).length:"",recap.length||"","","","","","","","",record.status,record.target_text,
        `${answer.recap?"Recap: ":""}${answer.prompt??answer.skill}`,answer.selectedAnswer??"Not saved in this older record",answer.correctAnswer,answer.correct?"Correct":"Needs practice"]);
    }
  }
  return "\uFEFF"+rows.map(row=>row.map(cell).join(",")).join("\r\n");
}
