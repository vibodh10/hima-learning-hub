import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { studyContentFor } from "./mini-study-content";
import { nextStudyLesson, publicStudyQuestions, studyDay, studyQuestionSet, studyThinking, type StudyCard, type StudyGrade, type StudyQuestionKey, type StudyReward } from "./mini-study";
import {selectStudyAssignment,studyHistoryForUnit,studySupportBaseline,type StudyAssignment} from "./mini-study-planning";

export type StudySessionRow = {
  id:string;learner_id:string;class_id:string;unit_id:string;unit_code:string;lesson_id:string;
  kind:"baseline"|"daily";status:"opened"|"review"|"completed"|"abandoned";
  content:Omit<StudyCard,"sessionId"|"questions">;question_keys:StudyQuestionKey[];
  grade:StudyGrade|null;completed_at:string|null;reward:StudyReward|null;
};
export type StudyHome =
  | {status:"unavailable";message:string}
  | {status:"done";reward:StudyReward}
  | {status:"complete";message:string}
  | {status:"ready";unitTitle:string;kind:"baseline"|"daily"}
  | {status:"active";card:StudyCard;grade:StudyGrade|null};

function related<T>(value:T|T[]|null):T|undefined { return Array.isArray(value)?value[0]:value??undefined; }

export async function studyContext(learnerId:string) {
  const client=await createClient();
  const {data,error}=await client.from("enrolments")
    .select("class_id,classes!inner(id,name,active_unit_id,published,archived_at)")
    .eq("student_id",learnerId).is("archived_at",null).is("classes.archived_at",null)
    .eq("classes.published",true).order("class_id");
  if(error) throw new Error("Your assigned learning could not be loaded. Please try again.");
  const assignments:StudyAssignment[]=[];
  for(const row of data??[]) {
    const group=related(row.classes);
    if(!group?.active_unit_id) continue;
    const {data:assigned,error:assignedError}=await client.from("class_units")
      .select("units!inner(id,code,title)").eq("class_id",row.class_id).eq("unit_id",group.active_unit_id)
      .eq("active",true).is("archived_at",null).maybeSingle();
    if(assignedError) throw new Error("Your assigned unit could not be checked. Please try again.");
    const unit=assigned?related(assigned.units):undefined;
    if(unit) assignments.push({classId:row.class_id,unitId:unit.id,unitCode:unit.code,unitTitle:unit.title});
  }
  if(!assignments.length)return null;
  const {data:history,error:historyError}=await createAdminClient().from("mini_study_sessions")
    .select("class_id,unit_id,status,kind,lesson_id,grade,completed_at,opened_at").eq("learner_id",learnerId).neq("status","abandoned").order("opened_at");
  if(historyError)throw new Error("Your saved learning could not be checked. Please try again.");
  return selectStudyAssignment(assignments,history??[],assignment=>{
    const content=studyContentFor(assignment.unitCode);
    return Boolean(content&&nextStudyLesson(content.lessons,studyHistoryForUnit(history??[],assignment.unitId)));
  })??null;
}

export function cardForSession(row:StudySessionRow):StudyCard {
  // Explicit allow-list; never spread a database row or answer-key object into a client payload.
  const content=row.content;
  return {sessionId:row.id,kind:row.kind,title:content.title,unitTitle:content.unitTitle,
    lines:content.lines,example:content.example,support:content.support,thinking:content.thinking,
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

async function studyHomeForContext(learnerId:string,context:StudyAssignment|null,continueToday=false):Promise<StudyHome> {
  if(!context) return {status:"unavailable",message:"Your teacher needs to assign a group and unit before your next step is available."};
  const admin=createAdminClient();
  const {data:rows,error}=await admin.from("mini_study_sessions").select("*")
    .eq("learner_id",learnerId).neq("status","abandoned").order("opened_at",{ascending:false});
  if(error) throw new Error("Your short learning steps are not available yet. Please try again later.");
  const sessions=(rows??[]) as StudySessionRow[];
  const today=studyDay(new Date());
  const completedToday=sessions.find(s=>s.completed_at && studyDay(new Date(s.completed_at))===today);
  const active=sessions.find(s=>s.class_id===context.classId && s.unit_id===context.unitId && ["opened","review"].includes(s.status));
  if(active) return {status:"active",card:cardForSession(active),grade:active.grade};
  if(completedToday?.reward && !continueToday) return {status:"done",reward:completedToday.reward};
  const content=studyContentFor(context.unitCode);
  if(!content) return {status:"unavailable",message:"Your teacher's unit is assigned. Its short self-study steps are still being prepared."};
  const history=studyHistoryForUnit(sessions,context.unitId);
  const {data:legacy,error:legacyError}=await admin.from("unit_starting_point_baselines").select("id")
    .eq("learner_id",learnerId).eq("unit_id",context.unitId).maybeSingle();
  if(legacyError) throw new Error("Your existing starting point could not be checked. Please try again.");
  if(!legacy && !history.some(h=>h.kind==="baseline")) return {status:"ready",unitTitle:context.unitTitle,kind:"baseline"};
  return nextStudyLesson(content.lessons,history)
    ? {status:"ready",unitTitle:context.unitTitle,kind:"daily"}
    : {status:"complete",message:"You have finished the available self-study steps for this unit. Your teacher can see your learning record."};
}

/** Opaque response IDs prevent matching pairs by source indices rather than meaning. */
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
  // Plan the kind and questions against one assignment snapshot. The database
  // rechecks that exact assignment if the teacher changes it during this request.
  const context=await studyContext(learnerId);
  const home=await studyHomeForContext(learnerId,context,continueToday);
  if(home.status!=="ready") return home;
  if(!context) throw new Error("Your group assignment changed. Please refresh.");
  const content=studyContentFor(context.unitCode);
  if(!content) throw new Error("This unit's short steps are not ready yet.");
  const admin=createAdminClient();
  const {data:rows,error}=await admin.from("mini_study_sessions").select("*").eq("learner_id",learnerId)
    .eq("unit_id",context.unitId).eq("status","completed");
  if(error) throw new Error("Your previous step could not be checked. Please try again.");
  const history=studyHistoryForUnit((rows??[]) as StudySessionRow[],context.unitId);
  const selected=nextStudyLesson(content.lessons,history);
  if(!selected && home.kind==="daily") return {status:"complete",message:"You have finished the available steps."};
  const previousId=history.filter(h=>h.kind==="daily").at(-1)?.lessonId;
  const previous=content.lessons.find(l=>l.id===previousId);
  const {data:legacy,error:legacyError}=await admin.from("unit_starting_point_baselines").select("correct_count,question_count").eq("learner_id",learnerId).eq("unit_id",context.unitId).maybeSingle();
  if(legacyError)throw new Error("Your starting point could not be checked. Please try again.");
  const baseline=studySupportBaseline((rows??[]) as StudySessionRow[],context.unitId,legacy);
  const card:Omit<StudyCard,"sessionId"|"questions">=home.kind==="baseline"
    ? {kind:"baseline",title:"Your starting point",unitTitle:context.unitTitle,lines:["Four short questions, one at a time.","It is fine to choose ‘I'm not sure yet’. This helps choose your first step."],example:"",support:""}
    : {kind:"daily",title:selected!.title,unitTitle:context.unitTitle,lines:selected!.lines,example:selected!.example,support:selected!.support,thinking:studyThinking(selected!,baseline)};
  const keys=opaqueKeys(home.kind==="baseline"?content.baseline:studyQuestionSet(selected!,previous));
  const {data:id,error:openError}=await admin.rpc("open_mini_study",{learner_uuid:learnerId,class_uuid:context.classId,unit_uuid:context.unitId,
    lesson_value:home.kind==="baseline"?`${content.version}-baseline`:selected!.id,kind_value:home.kind,content_value:card,keys_value:keys});
  if(openError) {
    if(openError.message.includes("finished_today")) return getStudyHome(learnerId);
    throw new Error("Your step could not be opened. Please refresh and try again.");
  }
  const saved=await studySessionFor(learnerId,String(id));
  if(!saved) throw new Error("Your step could not be loaded. Please refresh.");
  return {status:"active",card:cardForSession(saved),grade:saved.grade};
}
