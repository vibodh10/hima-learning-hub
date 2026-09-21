import "server-only";
import {createAdminClient} from "@/lib/supabase/admin";
import {studyContentFor} from "./mini-study-content-expanded";
import {nextStudyLesson,studyDay,type StudyCompletion,type StudyGrade} from "./mini-study";
import {selectStudyAssignment,studyHistoryForUnit,type StudyAssignment,type StudyHistoryRow} from "./mini-study-planning";
import {startingPointId,prerequisiteLessons} from "./starting-point";
import {isCombinedUnit2Unit6} from "./mini-study-starting-point";
import {assessmentPlanFor,reinforcementLessonFor,taughtPracticeLessons} from "./mini-study-assessment";

export type PracticeExpectation={
  required:boolean;
  day:string;
  classId?:string;
  unitId?:string;
  unitTitle?:string;
  reason?:"starting_point"|"assessment"|"unfinished"|"reinforcement"|"practice";
};
export type PracticeMiss={id:string;learner_id:string;class_id:string;unit_id:string|null;missed_on:string;learner_notified_at:string|null;teacher_notified_at:string|null;created_at:string};

function related<T>(value:T|T[]|null):T|undefined{return Array.isArray(value)?value[0]:value??undefined;}
function schoolWeekday(now:Date){return new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",weekday:"short"}).format(now);}
export function practiceWeekStart(day:string){
  const date=new Date(`${day}T12:00:00Z`);
  const weekday=(date.getUTCDay()+6)%7;
  date.setUTCDate(date.getUTCDate()-weekday);
  return date.toISOString().slice(0,10);
}
export function practiceWeekEnd(day:string){
  const start=new Date(`${practiceWeekStart(day)}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate()+6);
  return start.toISOString().slice(0,10);
}

function sharedStartingPoint(rows:StudyHistoryRow[],assignment:StudyAssignment,classUnitCodes:string[]){
  if(!isCombinedUnit2Unit6(classUnitCodes))return undefined;
  return rows.find(row=>row.class_id===assignment.classId&&row.lesson_id===startingPointId&&row.status==="completed"&&row.completed_at);
}
function hasStartingPoint(rows:StudyHistoryRow[],assignment:StudyAssignment,classUnitCodes:string[]){
  return Boolean(sharedStartingPoint(rows,assignment,classUnitCodes))||rows.some(row=>row.unit_id===assignment.unitId&&row.lesson_id===startingPointId&&row.status==="completed");
}
function historyForContext(rows:StudyHistoryRow[],assignment:StudyAssignment,classUnitCodes:string[]):StudyCompletion[]{
  const own=studyHistoryForUnit(rows,assignment.unitId);
  if(own.some(item=>item.kind==="baseline"))return own;
  const shared=sharedStartingPoint(rows,assignment,classUnitCodes);
  if(!shared?.completed_at)return own;
  return [...own,{lessonId:startingPointId,completedAt:shared.completed_at,kind:"baseline" as const,feedback:(shared.grade as StudyGrade|null)?.feedback??[]}]
    .sort((a,b)=>a.completedAt.localeCompare(b.completedAt));
}
function prerequisitePractice(history:StudyCompletion[]){
  return prerequisiteLessons.filter(lesson=>history.some(item=>item.kind==="baseline"&&item.feedback.some(answer=>!answer.correct&&answer.skill===lesson.skill)));
}
function hasAutomaticStep(day:string,assignment:StudyAssignment,classUnitCodes:string[],rows:StudyHistoryRow[]){
  const content=studyContentFor(assignment.unitCode);
  if(!content)return false;
  const history=historyForContext(rows,assignment,classUnitCodes);
  if(assessmentPlanFor(day,assignment.unitCode,content.lessons,history))return true;
  if(reinforcementLessonFor(content.lessons,history))return true;
  return Boolean(nextStudyLesson([...prerequisitePractice(history),...taughtPracticeLessons(assignment.unitCode,content.lessons)],history));
}

/**
 * Uses the same saved evidence and automatic-selection rules as the learner study
 * screen, but with the service-role client so a scheduled job can check every learner.
 * Weekends and organisation calendar holidays/closures never create red badges.
 */
export async function practiceExpectationForLearner(learnerId:string,now=new Date()):Promise<PracticeExpectation>{
  const day=studyDay(now);
  if(["Sat","Sun"].includes(schoolWeekday(now)))return {required:false,day};
  const admin=createAdminClient();
  const {data:enrolments,error:enrolmentError}=await admin.from("enrolments")
    .select("class_id,enrolled_at,classes!inner(id,published,archived_at,academic_year_id)")
    .eq("student_id",learnerId).is("archived_at",null).is("classes.archived_at",null)
    .eq("classes.published",true).order("enrolled_at",{ascending:false}).limit(1);
  if(enrolmentError||!enrolments?.length)return {required:false,day};
  const classId=enrolments[0].class_id;
  const group=related(enrolments[0].classes);
  const academicYearId=group?.academic_year_id;
  if(!academicYearId)return {required:false,day};
  const {data:closures,error:closureError}=await admin.from("academic_calendar_events").select("id")
    .eq("academic_year_id",academicYearId).is("archived_at",null).in("kind",["holiday","college_closure"])
    .lte("starts_on",day).gte("ends_on",day).limit(1);
  // Attendance automation fails safe: if the calendar cannot be checked, do not
  // create a red badge that might represent a college closure as non-attendance.
  if(closureError||closures?.length)return {required:false,day,classId};
  const {data:assigned,error:assignedError}=await admin.from("class_units")
    .select("units!inner(id,code,title)").eq("class_id",classId).eq("active",true).is("archived_at",null).order("unit_id");
  if(assignedError)return {required:false,day};
  const assignments:StudyAssignment[]=(assigned??[]).flatMap(row=>{
    const unit=related(row.units);
    return unit?[{classId,unitId:unit.id,unitCode:unit.code,unitTitle:unit.title}]:[];
  });
  if(!assignments.length)return {required:false,day};
  const classUnitCodes=assignments.map(item=>item.unitCode);
  const {data:history,error:historyError}=await admin.from("mini_study_sessions")
    .select("class_id,unit_id,status,kind,lesson_id,grade,completed_at,opened_at,paused_for_starting_point,reward")
    .eq("learner_id",learnerId).neq("status","abandoned").order("opened_at");
  if(historyError)return {required:false,day};
  const rows=(history??[]) as (StudyHistoryRow&{reward?:unknown})[];
  const active=rows.find(row=>!row.paused_for_starting_point&&["opened","review"].includes(row.status)&&assignments.some(item=>item.classId===row.class_id&&item.unitId===row.unit_id));
  if(active){
    const assignment=assignments.find(item=>item.classId===active.class_id&&item.unitId===active.unit_id)!;
    return {required:true,day,classId:assignment.classId,unitId:assignment.unitId,unitTitle:assignment.unitTitle,reason:"unfinished"};
  }
  const due=assignments.filter(assignment=>hasStartingPoint(rows,assignment,classUnitCodes)&&Boolean(studyContentFor(assignment.unitCode)&&assessmentPlanFor(day,assignment.unitCode,studyContentFor(assignment.unitCode)!.lessons,historyForContext(rows,assignment,classUnitCodes))));
  const pool=due.length?due:assignments;
  const selected=selectStudyAssignment(pool,rows,assignment=>{
    if(!hasStartingPoint(rows,assignment,classUnitCodes))return true;
    return hasAutomaticStep(day,assignment,classUnitCodes,rows);
  });
  if(!selected)return {required:false,day};
  if(!hasStartingPoint(rows,selected,classUnitCodes))return {required:true,day,classId:selected.classId,unitId:selected.unitId,unitTitle:selected.unitTitle,reason:"starting_point"};
  const historyForUnit=historyForContext(rows,selected,classUnitCodes);
  const content=studyContentFor(selected.unitCode);
  if(!content)return {required:false,day};
  if(assessmentPlanFor(day,selected.unitCode,content.lessons,historyForUnit))return {required:true,day,classId:selected.classId,unitId:selected.unitId,unitTitle:selected.unitTitle,reason:"assessment"};
  const completedToday=rows.some(row=>row.class_id===selected.classId&&row.status==="completed"&&row.completed_at&&studyDay(new Date(row.completed_at))===day);
  if(completedToday)return {required:false,day,classId:selected.classId,unitId:selected.unitId,unitTitle:selected.unitTitle};
  if(reinforcementLessonFor(content.lessons,historyForUnit))return {required:true,day,classId:selected.classId,unitId:selected.unitId,unitTitle:selected.unitTitle,reason:"reinforcement"};
  if(nextStudyLesson([...prerequisitePractice(historyForUnit),...taughtPracticeLessons(selected.unitCode,content.lessons)],historyForUnit))return {required:true,day,classId:selected.classId,unitId:selected.unitId,unitTitle:selected.unitTitle,reason:"practice"};
  return {required:false,day,classId:selected.classId,unitId:selected.unitId,unitTitle:selected.unitTitle};
}

export async function learnerPracticeMissesThisWeek(learnerId:string,now=new Date()):Promise<PracticeMiss[]>{
  const day=studyDay(now);const start=practiceWeekStart(day);const end=practiceWeekEnd(day);
  const {data,error}=await createAdminClient().from("mini_study_practice_misses").select("*")
    .eq("learner_id",learnerId).gte("missed_on",start).lte("missed_on",end).order("missed_on");
  if(error)return [];
  return (data??[]) as PracticeMiss[];
}