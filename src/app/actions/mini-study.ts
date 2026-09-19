"use server";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { gradeStudy, type StudyResult, type StudyReward } from "@/lib/mini-study";
import { openStudySession, studySessionFor, type StudyHome } from "@/lib/mini-study-server";
import {studentSafeStudyHome} from "@/lib/mini-study-public";

export type AssessmentIntegrityEventType="fullscreen_exit"|"tab_hidden"|"fullscreen_return";

export async function beginMiniStudy(continueToday=false):Promise<StudyHome> {
  const actor=await getSessionProfile();
  if(!actor || actor.role!=="student") return {status:"unavailable",message:"Please sign in as a student."};
  try { return studentSafeStudyHome(await openStudySession(actor.id,continueToday===true)); }
  catch { return {status:"unavailable",message:"Your step could not be opened. Please refresh and try again."}; }
}

/** Browser integrity evidence is factual only; it never auto-fails or accuses a learner. */
export async function recordAssessmentIntegrityEvent(sessionId:string,eventType:AssessmentIntegrityEventType):Promise<void> {
  const actor=await getSessionProfile();
  if(!actor || actor.role!=="student")return;
  if(typeof sessionId!=="string"||!/^[a-f0-9-]{36}$/i.test(sessionId))return;
  if(!["fullscreen_exit","tab_hidden","fullscreen_return"].includes(eventType))return;
  try{
    const admin=createAdminClient();
    const {data:session,error}=await admin.from("mini_study_sessions").select("id,status,content")
      .eq("id",sessionId).eq("learner_id",actor.id).maybeSingle();
    if(error||!session||!["opened","review"].includes(session.status))return;
    const content=session.content as {assessmentKind?:unknown}|null;
    if(!content||!["formative","summative"].includes(String(content.assessmentKind??"")))return;
    // Browser events can arrive in a burst. Keep one same-type event per second so
    // a single transition does not create a misleadingly large teacher record.
    const {data:last}=await admin.from("mini_study_integrity_events").select("occurred_at")
      .eq("session_id",sessionId).eq("event_type",eventType).order("occurred_at",{ascending:false}).limit(1).maybeSingle();
    if(last?.occurred_at&&Date.now()-Date.parse(last.occurred_at)<1000)return;
    await admin.from("mini_study_integrity_events").insert({session_id:sessionId,event_type:eventType});
  }catch{
    // Integrity logging must never destroy or submit a learner's assessment.
  }
}

export async function checkMiniStudy(sessionId:string,responses:unknown):Promise<StudyResult> {
  const actor=await getSessionProfile();
  if(!actor || actor.role!=="student") return {ok:false,message:"Please sign in as a student."};
  if(typeof sessionId!=="string" || !/^[a-f0-9-]{36}$/i.test(sessionId)) return {ok:false,message:"Please reopen your step."};
  try {
    const session=await studySessionFor(actor.id,sessionId);
    if(!session) return {ok:false,message:"Please reopen your assigned step."};
    const grade=gradeStudy(session.question_keys,responses);
    if(!grade) return {ok:false,message:"Answer each question once. For matching, use each answer once."};
    const missed=grade.feedback.find(f=>!f.correct);
    const target=missed?`Practise ${missed.skill}: review the example and explain the correct idea in your next short check.`:"Recall this idea in your next short check, then explain it with an example.";
    const {error}=await createAdminClient().rpc("check_mini_study",{learner_uuid:actor.id,session_uuid:sessionId,grade_value:grade,target_value:target});
    if(error) return {ok:false,message:"Your answers could not be saved. Keep this page open and try again."};
    const content=session.content as {assessmentKind?:unknown}|null;
    const formal=Boolean(content&&["formative","summative"].includes(String(content.assessmentKind??"")));
    if(formal){
      const first=session.question_keys[0];
      const safeFeedback=first?[{
        questionId:first.id,correct:grade.correct===grade.total,recap:false,skill:"assessment",
        explanation:"Detailed question feedback is kept for your tutor during the assessment period. Hima will automatically select any second practice you need.",
        correctAnswer:"Detailed answers are not released during the assessment period.",prompt:"Your assessment has been submitted."
      }]:[];
      // Teachers and automatic reinforcement retain the complete grade in the DB.
      // Students receive only a submission message and score, so the first
      // finisher cannot harvest the answer key for classmates.
      return {ok:true,grade:{correct:grade.correct,total:grade.total,feedback:safeFeedback}};
    }
    return {ok:true,grade};
  } catch { return {ok:false,message:"Your answers could not be saved. Keep this page open and try again."}; }
}

export async function finishMiniStudy(sessionId:string):Promise<{ok:true;reward:StudyReward}|{ok:false;message:string}> {
  const actor=await getSessionProfile();
  if(!actor || actor.role!=="student") return {ok:false,message:"Please sign in as a student."};
  if(typeof sessionId!=="string" || !/^[a-f0-9-]{36}$/i.test(sessionId)) return {ok:false,message:"Please reopen your step."};
  try {
    const {data,error}=await createAdminClient().rpc("finish_mini_study",{learner_uuid:actor.id,session_uuid:sessionId});
    if(error) return {ok:false,message:"Your completion could not be saved. Please try again; rewards will not be duplicated."};
    revalidatePath("/study");revalidatePath("/dashboard");
    return {ok:true,reward:data};
  } catch { return {ok:false,message:"Your completion could not be saved. Please try again."}; }
}
