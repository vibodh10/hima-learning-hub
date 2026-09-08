import type {StudyCompletion,StudyGrade} from "./mini-study";

export type StudyAssignment={classId:string;unitId:string;unitCode:string;unitTitle:string};
export type StudyHistoryRow={class_id:string;unit_id:string;status:string;kind:"baseline"|"daily";lesson_id:string;grade:StudyGrade|null;completed_at:string|null;opened_at?:string};

/** Finish a valid saved step first, otherwise rotate fairly through teacher-set groups. No student picker. */
export function selectStudyAssignment(assignments:StudyAssignment[],history:StudyHistoryRow[],hasNextStep:(assignment:StudyAssignment)=>boolean=()=>true):StudyAssignment|undefined {
  const active=history.find(row=>["opened","review"].includes(row.status)&&assignments.some(a=>a.classId===row.class_id&&a.unitId===row.unit_id));
  if(active)return assignments.find(a=>a.classId===active.class_id&&a.unitId===active.unit_id);
  const last=(assignment:StudyAssignment)=>history.filter(row=>row.class_id===assignment.classId&&row.unit_id===assignment.unitId&&row.status==="completed")
    .reduce((value,row)=>row.completed_at && row.completed_at>value?row.completed_at:value,"");
  const available=assignments.filter(hasNextStep);
  // A finished or temporarily unavailable unit must not block another teacher's
  // ready step. Keep an assignment for an honest empty-state message if all are done.
  return [...(available.length?available:assignments)].sort((a,b)=>last(a).localeCompare(last(b))||a.classId.localeCompare(b.classId))[0];
}

/** A move between groups must not reset the same unit's starting point or completed ideas. */
export function studyHistoryForUnit(rows:StudyHistoryRow[],unitId:string):StudyCompletion[] {
  return rows.filter(row=>row.unit_id===unitId&&row.status==="completed"&&row.completed_at)
    .map(row=>({lessonId:row.lesson_id,completedAt:row.completed_at!,kind:row.kind,feedback:row.grade?.feedback??[]}))
    .sort((a,b)=>a.completedAt.localeCompare(b.completedAt));
}

export function studySupportBaseline(rows:StudyHistoryRow[],unitId:string,legacy?:{correct_count:number;question_count:number}|null):StudyGrade|undefined {
  const saved=[...rows].filter(row=>row.unit_id===unitId&&row.kind==="baseline"&&row.status==="completed")
    .sort((a,b)=>(a.completed_at??"").localeCompare(b.completed_at??""))[0];
  // An old full-unit instrument informs support but is never relabelled as a four-question mini baseline.
  return saved?.grade??(legacy?{correct:legacy.correct_count,total:legacy.question_count,feedback:[]}:undefined);
}
