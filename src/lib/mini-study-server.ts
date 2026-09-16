import {startingPointId,prerequisiteLessons} from "./starting-point";
import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { studyContentFor } from "./mini-study-content-expanded";
import { nextStudyLesson, publicStudyQuestions, studyDay, studyQuestionSet, studyThinking, type StudyCard, type StudyGrade, type StudyQuestionKey, type StudyReward } from "./mini-study";
import {selectStudyAssignment,studyHistoryForUnit,studySupportBaseline,type StudyAssignment} from "./mini-study-planning";
import {isCombinedUnit2Unit6,startingPointDisplayTitle,startingPointQuestionsForAssignment} from "./mini-study-starting-point";

export type StudySessionRow = {
  id:string;learner_id:string;class_id:string;unit_id:string;unit_code:string;lesson_id:string;
  kind:"baseline"|"daily";status:"opened"|"review"|"completed"|"abandoned";
  content:Omit<StudyCard,"sessionId"|"questions">;question_keys:StudyQuestionKey[];
  grade:StudyGrade|null;completed_at:string|null;reward:StudyReward|null;paused_for_starting_point:boolean;
};
export type StudyHome =
  | {status:"unavailable";message:string}
  | {status:"done";reward:StudyReward}
  | {status:"complete";message:string}
  | {status:"ready";unitTitle:string;kind:"baseline"|"daily"}
  | {status:"active";card:StudyCard;grade:StudyGrade|null};

type StudyContext=StudyAssignment&{classUnitCodes:string[]};

function related<T>(value:T|T[]|null):T|undefined { return Array.isArray(value)?value[0]:value??undefined; }

function sharedStartingPointSession(rows:StudySessionRow[],context:StudyContext):StudySessionRow|undefined {
  if(!isCombinedUnit2Unit6(context.classUnitCodes))return undefined;
  return rows.find(row=>row.class_id===context.classId&&row.lesson_id===startingPointId&&row.status==="completed"&&row.completed_at);
}

function hasStartingPoint(rows:StudySessionRow[],context:StudyContext):boolean {
  if(sharedStartingPointSession(rows,context))return true;
  return rows.some(row=>row.unit_id===context.unitId&&row.lesson_id===startingPointId&&row.status==="completed");
}

function studyHistoryForContext(rows:StudySessionRow[],context:StudyContext) {
  const own=studyHistoryForUnit(rows,context.unitId);
  if(own.some(item=>item.kind==="baseline"))return own;
  const shared=sharedStartingPointSession(rows,context);
  if(!shared?.completed_at)return own;
  return [...own,{lessonId:startingPointId,completedAt:shared.completed_at,kind:"baseline" as const,feedback:shared.grade?.feedback??[]}]
    .sort((a,b)=>a.completedAt.localeCompare(b.completedAt));
}

function studySupportBaselineForContext(rows:StudySessionRow[],context:StudyContext,legacy?:{correct_count:number;question_count:number}|null) {
  const own=studySupportBaseline(rows,context.unitId,legacy);
  if(own)return own;
  return sharedStartingPointSession(rows,context)?.grade??undefined;
}

export async function studyContext(learnerId:string):Promise<StudyContext|null> {
  const client=await createClient();
  const {data,error}=await client.from("enrolments")
    .select("class_id,classes!inner(id,name,published,archived_at)")
    .eq("student_id",learnerId).is("archived_at",null).is("classes.archived_at",null)
    .eq("classes.published",true).order("class_id");
  if(error) throw new Error("Your assigned learning could not be loaded. Please try again.");
  const assignments:StudyAssignment[]=[];
  for(const row of data??[]) {
    const group=related(row.classes);
    if(!group) continue;
    const {data:assigned,error:assignedError}=await client.from("class_units")
      .select("units!inner(id,code,title)").eq("class_id",row.class_id)
      .eq("active",true).is("archived_at",null).order("unit_id");
    if(assignedError) throw new Error("Your assigned units could not be checked. Please try again.");
    for(const assignedRow of assigned??[]) {
      const unit=related(assignedRow.units);
      if(unit) assignments.push({classId:row.class_id,unitId:unit.id,unitCode:unit.code,unitTitle:unit.title});
    }
  }
  if(!assignments.length)return null;
  const {data:history,error:historyError}=await createAdminClient().from("mini_study_sessions")
    .select("class_id,unit_id,status,kind,lesson_id,grade,completed_at,opened_at,paused_for_starting_point").eq("learner_id",learnerId).neq("status","abandoned").order("opened_at");
  if(historyError)throw new Error("Your saved learning could not be checked. Please try again.");
  const selected=selectStudyAssignment(assignments,history??[],assignment=>{
    const assignmentHistory=studyHistoryForUnit(history??[],assignment.unitId);
    const classUnitCodes=assignments.filter(item=>item.classId===assignment.classId).map(item=>item.unitCode);
    const sharedComplete=isCombinedUnit2Unit6(classUnitCodes)&&(history??[]).some(row=>row.class_id===assignment.classId&&row.lesson_id===startingPointId&&row.status==="completed");
    if(!assignmentHistory.some(item=>item.kind==="baseline")&&!sharedComplete) return true;
    const content=studyContentFor(assignment.unitCode);
    return Boolean(content&&nextStudyLesson(content.lessons,assignmentHistory));
  });
  if(!selected)return null;
  return {...selected,classUnitCodes:assignments.filter(item=>item.classId===selected.classId).map(item=>item.unitCode)};
}

export function cardForSession(row:StudySessionRow):StudyCard {
  const content=row.content;
  return {sessionId:row.id,kind:row.kind,title:content.title,unitTitle:content.unitTitle,
    lines:content.lines,example:content.example,support:content.support,thinking:content.thinking,secondsPerQuestion:content.secondsPerQuestion,
    questions:publicStudyQuestions(row.question_keys,row.id)};
}

export async function studySessionFor(learnerId:string,sessionId:string) {
  const {data,error}=await createAdminClient().from("mini_study_sessions").select("*")
    .eq("id",sessionId).eq("learner_id",learnerId).maybeSingle();
  if(error) throw new Error("Your saved step could not be loaded. Please try again.");
  return data as StudySessionRow|null;
}

export async function getStudyHome(learnerId:string):Promise<StudyHome> {
  const context=await studyContext(learnerId);
  return studyHomeForContext(learnerId,context);
}

async function studyHomeForContext(learnerId:string,context:StudyContext|null,continueToday=false):Promise<StudyHome> {
  if(!context) return {status:"unavailable",message:"Your teacher needs to assign a group and unit before your next step is available."};
  const admin=createAdminClient();
  const {data:rows,error}=await admin.from("mini_study_sessions").select("*")
    .eq("learner_id",learnerId).neq("status","abandoned").order("opened_at",{ascending:false});
  if(error) throw new Error("Your short learning steps are not available yet. Please try again later.");
  const sessions=(rows??[]) as StudySessionRow[];
  const today=studyDay(new Date());
  const completedToday=sessions.find(s=>s.completed_at && studyDay(new Date(s.completed_at))===today);
  const active=sessions.find(s=>s.class_id===context.classId && s.unit_id===context.unitId && !s.paused_for_starting_point && ["opened","review"].includes(s.status));
  const startingPointComplete=hasStartingPoint(sessions,context);
  const displayTitle=startingPointDisplayTitle(context.unitTitle,context.classUnitCodes);
  if(!startingPointComplete&&active?.lesson_id!==startingPointId)return {status:"ready",unitTitle:displayTitle,kind:"baseline"};
  if(active) return {status:"active",card:cardForSession(active),grade:active.grade};
  if(completedToday?.reward && !continueToday && startingPointComplete) return {status:"done",reward:completedToday.reward};
  const content=studyContentFor(context.unitCode);
  if(!content) return {status:"unavailable",message:"Your assigned unit does not have self-study content yet."};
  const history=studyHistoryForContext(sessions,context);
  const {error:legacyError}=await admin.from("unit_starting_point_baselines").select("id")
    .eq("learner_id",learnerId).eq("unit_id",context.unitId).maybeSingle();
  if(legacyError) throw new Error("Your existing starting point could not be checked. Please try again.");
  if(!startingPointComplete) return {status:"ready",unitTitle:displayTitle,kind:"baseline"};
  return nextStudyLesson([...prerequisiteLessons.filter(l=>history.some(h=>h.kind==="baseline"&&h.feedback.some(f=>!f.correct&&f.skill===l.skill))),...content.lessons],history)
    ? {status:"ready",unitTitle:context.unitTitle,kind:"daily"}
    : {status:"complete",message:"No outstanding prerequisite practice. You have completed the current lessons and stretch challenges for this unit. Your learning record has been saved."};
}

function opaqueKeys(questions:StudyQuestionKey[]):StudyQuestionKey[] {
  return questions.map(q=>{
    const options=new Map(q.options.map(o=>[o.id,randomUUID()]));
    const stems=new Map((q.stems??[]).map(s=>[s.id,randomUUID()]));
    return {...q,options:q.options.map(o=>({...o,id:options.get(o.id)!})),
      ...(q.stems?{stems:q.stems.map(s=>({...s,id:stems.get(s.id)!}))}:{}),
      answer:typeof q.answer==="string"?options.get(q.answer)!:Object.fromEntries(Object.entries(q.answer).map(([s,o])=>[stems.get(s)!,options.get(o)!]))};
  });
}

export async function openStudySession(learnerId:string,continueToday=false):Promise<StudyHome> {
  const context=await studyContext(learnerId);
  const home=await studyHomeForContext(learnerId,context,continueToday);
  if(home.status!=="ready") return home;
  if(!context) throw new Error("Your group assignment changed. Please refresh.");
  const content=studyContentFor(context.unitCode);
  if(!content) throw new Error("This unit's short steps are not ready yet.");
  const admin=createAdminClient();
  const {data:rows,error}=await admin.from("mini_study_sessions").select("*").eq("learner_id",learnerId)
    .eq("status","completed");
  if(error) throw new Error("Your previous step could not be checked. Please try again.");
  const sessions=(rows??[]) as StudySessionRow[];
  const history=studyHistoryForContext(sessions,context);
  const selected=nextStudyLesson([...prerequisiteLessons.filter(l=>history.some(h=>h.kind==="baseline"&&h.feedback.some(f=>!f.correct&&f.skill===l.skill))),...content.lessons],history);
  if(!selected && home.kind==="daily") return {status:"complete",message:"No outstanding prerequisite practice. You have completed the current lessons and stretch challenges for this unit. Your learning record has been saved."};
  const previousId=history.filter(h=>h.kind==="daily").at(-1)?.lessonId;
  const previous=content.lessons.find(l=>l.id===previousId);
  const {data:legacy,error:legacyError}=await admin.from("unit_starting_point_baselines").select("correct_count,question_count").eq("learner_id",learnerId).eq("unit_id",context.unitId).maybeSingle();
  if(legacyError)throw new Error("Your starting point could not be checked. Please try again.");
  const baseline=studySupportBaselineForContext(sessions,context,legacy);
  const baselineQuestions=startingPointQuestionsForAssignment(context.unitCode,context.classUnitCodes);
  const displayTitle=startingPointDisplayTitle(context.unitTitle,context.classUnitCodes);
  const card:Omit<StudyCard,"sessionId"|"questions">=home.kind==="baseline"
    ? {kind:"baseline",title:`${displayTitle} starting point`,unitTitle:displayTitle,secondsPerQuestion:5,lines:[`${baselineQuestions.length} short starting-point questions covering your assigned units. Five seconds each, with automatic advance.`,`Timeouts need another check; they do not prove a missing skill.`],example:"",support:""}
    : {kind:"daily",title:selected!.title,unitTitle:context.unitTitle,lines:selected!.lines,example:selected!.example,support:selected!.support,thinking:studyThinking(selected!,baseline)};
  const keys=opaqueKeys(home.kind==="baseline"?baselineQuestions:studyQuestionSet(selected!,previous));
  const {data:id,error:openError}=await admin.rpc("open_mini_study",{learner_uuid:learnerId,class_uuid:context.classId,unit_uuid:context.unitId,
    lesson_value:home.kind==="baseline"?startingPointId:selected!.id,kind_value:home.kind,content_value:card,keys_value:keys});
  if(openError) {
    if(openError.message.includes("finished_today")) return getStudyHome(learnerId);
    throw new Error("Your step could not be opened. Please refresh and try again.");
  }
  const saved=await studySessionFor(learnerId,String(id));
  if(!saved) throw new Error("Your step could not be loaded. Please refresh.");
  return {status:"active",card:cardForSession(saved),grade:saved.grade};
}
