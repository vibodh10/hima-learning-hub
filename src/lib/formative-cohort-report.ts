import {buildFormativeAssessmentReport,type FormativeReportEntry} from "./formative-assessment-report";
import type {MiniStudyRecord} from "./mini-study-report";

export type FormativeCohortLearner={
  id:string;
  name:string;
  assessments:FormativeReportEntry[];
  latest:FormativeReportEntry|null;
  change:number|null;
  targets:string[];
};

export type FormativeCohortSummary={
  learners:FormativeCohortLearner[];
  assessmentNumbers:number[];
  stats:{number:number;completed:number;average:number|null}[];
};

export function buildFormativeCohortSummary(
  learners:{id:string;name:string}[],
  records:MiniStudyRecord[],
  unitId:string,
):FormativeCohortSummary{
  const rows=learners.map(learner=>{
    const report=buildFormativeAssessmentReport(records.filter(record=>record.learner_id===learner.id&&record.unit_id===unitId));
    const latest=report.assessments.at(-1)??null;
    const previous=report.assessments.length>1?report.assessments.at(-2)!:null;
    const targets=[...new Set(report.assessments.flatMap(item=>item.targetAreas))];
    return {
      id:learner.id,
      name:learner.name,
      assessments:report.assessments,
      latest,
      change:latest&&previous?Math.round((latest.percentage-previous.percentage)*10)/10:null,
      targets,
    };
  }).sort((a,b)=>a.name.localeCompare(b.name));

  const assessmentNumbers=[...new Set(rows.flatMap(row=>row.assessments.map(item=>item.number)))].sort((a,b)=>a-b);
  const stats=assessmentNumbers.map(number=>{
    const completed=rows.flatMap(row=>row.assessments.filter(item=>item.number===number));
    const average=completed.length?Math.round(completed.reduce((sum,item)=>sum+item.percentage,0)/completed.length*10)/10:null;
    return {number,completed:completed.length,average};
  });
  return {learners:rows,assessmentNumbers,stats};
}

const csvCell=(value:unknown)=>{
  const text=String(value??"");
  return /[",\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text;
};

export function formativeCohortCsv(groupName:string,unitLabel:string,summary:FormativeCohortSummary){
  const header=["Group","Unit","Learner","Assessment","Correct","Total","Percentage","Submitted","Target areas","Latest change (percentage points)"];
  const rows=summary.learners.flatMap(learner=>{
    if(!learner.assessments.length)return [[groupName,unitLabel,learner.name,"Not completed","","","","","",""]];
    return learner.assessments.map((assessment,index)=>[
      groupName,unitLabel,learner.name,`Formative Assessment ${assessment.number}`,assessment.correct,assessment.total,assessment.percentage,
      assessment.checkedAt??"",assessment.targetAreas.join("; "),
      index===learner.assessments.length-1&&learner.change!==null?learner.change:"",
    ]);
  });
  return "\uFEFF"+[header,...rows].map(row=>row.map(csvCell).join(",")).join("\r\n");
}
