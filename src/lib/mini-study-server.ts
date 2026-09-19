import {startingPointId,prerequisiteLessons} from "./starting-point";
import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { studyContentFor } from "./mini-study-content-expanded";
import { nextStudyLesson, publicStudyQuestions, studyDay, studyQuestionSet, studyThinking, type StudyCard, type StudyGrade, type StudyQuestionKey, type StudyReward } from "./mini-study";
import {selectStudyAssignment,studyHistoryForUnit,studySupportBaseline,type StudyAssignment} from "./mini-study-planning";
import {isCombinedUnit2Unit6,startingPointDisplayTitle,startingPointQuestionsForAssignment} from "./mini-study-starting-point";
import {assessmentPlanFor,isReinforcementLessonId,reinforcementLessonFor,taughtPracticeLessons} from "./mini-study-assessment";

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

function prerequisitePractice(history:ReturnType<typeof studyHistoryForUnit>){
  return prerequisiteLessons.filter(lesson=>history.some(item=>item.kind==="baseline"&&item.feedback.some(answer=>!answer.correct&&answer.skill===lesson.skill)));
}

function availablePractice(unitCode:string,lessons:ReturnType<typeof studyContentFor> extends {lessons:infer T}?T:never,history:ReturnType<typeof studyHistoryForUnit>){
  return [...prerequisitePractice(history),...taughtPracticeLessons(unitCode,lessons as never)];
}

function hasAutomaticStep(unitCode:string,history:ReturnType<typeof studyHistoryForUnit>){
  const content=studyContentFor(unitCode);
  if(!content)return false;
  if(assessmentPlanFor(studyDay(new Date()),unitCode,content.lessons,history))return true;
  if(reinforcementLessonFor(content.lessons,history))return true;
  return Boolean(nextStudyLesson([...prerequisitePractice(history),...taughtPracticeLessons(unitCode,content.lessons)],history));
}

export async function studyContext(learnerId:string):Promise<StudyContext|null> {
  const client=await createClient();
  const {data,error}=await client.from("enrolments")
    .select("class_id,enrolled_at,classes!inner(id,name,published,archived_at)")
    .eq("student_id",learnerId).is("archived_at",null).is("classes.archived_at",null)
    .eq("classes.published",true).order("enrolled_at",{ascending:false}).limit(1);
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

  const historyRows=history??[];
  const active=historyRows.find(row=>!row.paused_for_starting_point&&["opened","review"].includes(row.status)&&assignments.some(item=>item.classId===row.class_id&&item.unitId===row.unit_id));
  if(active){
    const assignment=assignments.find(item=>item.classId===active.class_id&&item.unitId===active.unit_id);
    if(assignment)return {...assignment,classUnitCodes:assignments.filter(item=>item.classId===assignment.classId).map(item=>item.unitCode)};
  }

  const today=studyDay(new Date());
  const dueAssignments=assignments.filter(assignment=>{
    const classUnitCodes=assignments.filter(item=>item.classId===assignment.classId).map(item=>item.unitCode);
    const assignmentHistory=studyHistoryForUnit(historyRows,assignment.unitId);
    const sharedComplete=isCombinedUnit2Unit6(classUnitCodes)&&historyRows.some(row=>row.class_id===assignment.classId&&row.lesson_id===startingPointId&&row.status==="completed");
    const startingPointComplete=assignmentHistory.some(item=>item.kind==="baseline")||sharedComplete;
    if(!startingPointComplete)return false;
    const content=studyContentFor(assignment.unitCode);
    return Boolean(content&&assessmentPlanFor(today,assignment.unitCode,content.lessons,assignmentHistory));
  });
  const pool=dueAssignments.length?dueAssignments:assignments;
  const selected=selectStudyAssignment(pool,historyRows,assignment=>{
    const assignmentHistory=studyHistoryForUnit(historyRows,assignment.unitId);
    const classUnitCodes=assignments.filter(item=>item.classId===assignment.classId).map(item=>item.unitCode);
    const sharedComplete=isCombinedUnit2Unit6(classUnitCodes)&&historyRows.some(row=>row.class_id===assignment.classId&&row.lesson_id===startingPointId&&row.status==="completed");
    if(!assignmentHistory.some(item=>item.kind==="baseline")&&!sharedComplete) return true;
    return hasAutomaticStep(assignment.unitCode,assignmentHistory);
  });
  if(!selected)return null;
  return {...selected,classUnitCodes:assignments.filter(item=>item.classId===selected.classId).map(item=>item.unitCode)};
}

export function cardForSession(row:StudySessionRow):StudyCard {
  const content=row.content;
  return {sessionId:row.id,kind:row.kind,title:content.title,unitTitle:content.unitTitle,
    lines:content.lines,example:content.example,support:content.support,thinking:content.thinking,secondsPerQuestion:content.secondsPerQuestion,
    assessmentKind:content.assessmentKind,assessmentNumber:content.assessmentNumber,
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
  const completedToday=sessions.find(s=>s.class_id===context.classId&&s.completed_at&&studyDay(new Date(s.completed_at))===today);
  const active=sessions.find(s=>s.class_id===context.classId && s.unit_id===context.unitId && !s.paused_for_starting_point && ["opened","review"].includes(s.status));
  const startingPointComplete=hasStartingPoint(sessions,context);
  const displayTitle=startingPointDisplayTitle(context.unitTitle,context.classUnitCodes);
  if(!startingPointComplete&&active?.lesson_id!==startingPointId)return {status:"ready",unitTitle:displayTitle,kind:"baseline"};
  if(active) return {status:"active",card:cardForSession(active),grade:active.grade};
  const content=studyContentFor(context.unitCode);
  if(!content) return {status:"unavailable",message:"Your assigned unit does not have self-study content yet."};
  const history=studyHistoryForContext(sessions,context);
  const {error:legacyError}=await admin.from("unit_starting_point_baselines").select("id")
    .eq("learner_id",learnerId).eq("unit_id",context.unitId).maybeSingle();
  if(legacyError) throw new Error("Your existing starting point could not be checked. Please try again.");
  if(!startingPointComplete) return {status:"ready",unitTitle:displayTitle,kind:"baseline"};

  const dueAssessment=assessmentPlanFor(today,context.unitCode,content.lessons,history);
  if(dueAssessment)return {status:"ready",unitTitle:context.unitTitle,kind:"daily"};
  if(completedToday?.reward && !continueToday) return {status:"done",reward:completedToday.reward};

  const hasStep=Boolean(reinforcementLessonFor(content.lessons,history)
    ??nextStudyLesson([...prerequisitePractice(history),...taughtPracticeLessons(context.unitCode,content.lessons)],history));
  return hasStep
    ? {status:"ready",unitTitle:context.unitTitle,kind:"daily"}
    : {status:"complete",message:"You are up to date with the topics your tutor has taught so far. Hima will wait for the next formal check or give second practice automatically when evidence shows a skill needs reinforcement."};
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
  const {error:staleError}=await admin.from("mini_study_sessions").update({status:"abandoned"})
    .eq("learner_id",learnerId).in("status",["opened","review"]).neq("class_id",context.classId);
  if(staleError) throw new Error("Your previous group step could not be closed safely. Please refresh and try again.");
  const {data:rows,error}=await admin.from("mini_study_sessions").select("*").eq("learner_id",learnerId)
    .eq("status","completed");
  if(error) throw new Error("Your previous step could not be checked. Please try again.");
  const sessions=(rows??[]) as StudySessionRow[];
  const history=studyHistoryForContext(sessions,context);
  const assessment=assessmentPlanFor(studyDay(new Date()),context.unitCode,content.lessons,history);
  const reinforcement=assessment?undefined:reinforcementLessonFor(content.lessons,history);
  const selected=reinforcement??(assessment?undefined:nextStudyLesson([...prerequisitePractice(history),...taughtPracticeLessons(context.unitCode,content.lessons)],history));
  if(!selected&&!assessment&&home.kind==="daily") return {status:"complete",message:"You are up to date with the topics your tutor has taught so far. Hima will wait for the next formal check or give second practice automatically when evidence shows a skill needs reinforcement."};
  const previousId=history.filter(h=>h.kind==="daily"&&!h.lessonId.startsWith("assessment:")&&!h.lessonId.startsWith("reinforce:")).at(-1)?.lessonId;
  const previous=content.lessons.find(l=>l.id===previousId);
  const {data:legacy,error:legacyError}=await admin.from("unit_starting_point_baselines").select("correct_count,question_count").eq("learner_id",learnerId).eq("unit_id",context.unitId).maybeSingle();
  if(legacyError)throw new Error("Your starting point could not be checked. Please try again.");
  const baseline=studySupportBaselineForContext(sessions,context,legacy);
  const baselineQuestions=startingPointQuestionsForAssignment(context.unitCode,context.classUnitCodes);
  const displayTitle=startingPointDisplayTitle(context.unitTitle,context.classUnitCodes);
  const card:Omit<StudyCard,"sessionId"|"questions">=home.kind==="baseline"
    ? {kind:"baseline",title:`${displayTitle} starting point`,unitTitle:displayTitle,secondsPerQuestion:5,lines:[`${baselineQuestions.length} short starting-point questions covering your assigned units. Five seconds each, with automatic advance.`,`Timeouts need another check; they do not prove a missing skill.`],example:"",support:""}
    : assessment
      ? {kind:"daily",title:assessment.title,unitTitle:context.unitTitle,assessmentKind:assessment.kind,assessmentNumber:assessment.number,
          lines:["This formal learning check covers material your tutor has already taught in class.","Answer independently. If a skill is not secure, Hima will automatically give you relevant second practice and recheck it."],example:"",support:""}
      : {kind:"daily",title:selected!.title,unitTitle:context.unitTitle,lines:selected!.lines,example:selected!.example,support:selected!.support,thinking:studyThinking(selected!,baseline)};
  const questionSource=home.kind==="baseline"?baselineQuestions:assessment?assessment.questions:isReinforcementLessonId(selected!.id)?selected!.questions:studyQuestionSet(selected!,previous);
  const keys=opaqueKeys(questionSource);
  const lessonId=home.kind==="baseline"?startingPointId:assessment?assessment.lessonId:selected!.id;
  const {data:id,error:openError}=await admin.rpc("open_mini_study",{learner_uuid:learnerId,class_uuid:context.classId,unit_uuid:context.unitId,
    lesson_value:lessonId,kind_value:home.kind,content_value:card,keys_value:keys});
  if(openError) {
    if(openError.message.includes("finished_today")) return getStudyHome(learnerId);
    throw new Error("Your step could not be opened. Please refresh and try again.");
  }
  const saved=await studySessionFor(learnerId,String(id));
  if(!saved) throw new Error("Your step could not be loaded. Please refresh.");
  return {status:"active",card:cardForSession(saved),grade:saved.grade};
}
