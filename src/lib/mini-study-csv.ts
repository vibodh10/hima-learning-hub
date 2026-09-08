import {miniStudyLearnerSummary,type MiniStudyRecord,type StudyLegacyBaseline} from "./mini-study-report";

function cell(value:unknown){
  let text=String(value??"");
  // Names can be user supplied. Quoting alone does not prevent spreadsheet formulas.
  if(/^[\s\uFEFF]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text))text=`'${text}`;
  return `"${text.replaceAll('"','""')}"`;
}

export function miniStudyCsv(group:string,learners:{id:string;name:string}[],records:MiniStudyRecord[],baselines:StudyLegacyBaseline[]){
  const rows:unknown[][]=[
    ["Short formative self-study; not assignment grades. Different topics and starting-point instruments are not directly comparable."],
    ["Group","Student","Record type","Step","Checked at (UTC)","Correct (new learning)","Total (new learning)","Recap correct","Recap total","Completed daily steps","Status","Automatic target","Question","First answer","Expected answer","Answer result"],
  ];
  for(const learner of learners){
    const own=records.filter(r=>r.learner_id===learner.id&&r.status!=="abandoned");
    const summary=miniStudyLearnerSummary(own);
    rows.push([group,learner.name,"Current summary",summary.latest?.title??"No daily check recorded",summary.latest?.checkedAt,
      summary.latest?.grade.correct,summary.latest?.grade.total,summary.recap?.correct,summary.recap?.total,summary.completedSteps,
      summary.needsHelp?"Support suggested":summary.latest?"Learning recorded":"Starting point or next step pending",summary.target]);
    const legacy=baselines.find(b=>b.learner_id===learner.id);
    if(legacy)rows.push([group,learner.name,"Existing full-unit starting point","Preserved full-unit assessment",legacy.completed_at,legacy.correct_count,legacy.question_count,"","","","Completed"]);
    for(const record of own.filter(r=>r.grade).sort((a,b)=>(a.checked_at??"").localeCompare(b.checked_at??""))){
      const grade=record.grade!;
      const recap=grade.feedback.filter(f=>f.recap);
      for(const answer of grade.feedback)rows.push([group,learner.name,record.kind==="baseline"?"Short starting point":"Daily step",record.content.title,record.checked_at,
        grade.correct,grade.total,recap.length?recap.filter(f=>f.correct).length:"",recap.length||"","",record.status,record.target_text,
        `${answer.recap?"Recap: ":""}${answer.prompt??answer.skill}`,answer.selectedAnswer??"Not saved in this older record",answer.correctAnswer,answer.correct?"Correct":"Needs practice"]);
    }
  }
  return "\uFEFF"+rows.map(row=>row.map(cell).join(",")).join("\r\n");
}
