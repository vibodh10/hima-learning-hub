"use server";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { gradeStudy, type StudyResult, type StudyReward } from "@/lib/mini-study";
import { openStudySession, studySessionFor, type StudyHome } from "@/lib/mini-study-server";

export async function beginMiniStudy():Promise<StudyHome> {
  const actor=await getSessionProfile();
  if(!actor || actor.role!=="student") return {status:"unavailable",message:"Please sign in as a student."};
  try { return await openStudySession(actor.id); }
  catch { return {status:"unavailable",message:"Your step could not be opened. Please refresh and try again."}; }
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
    const {data,error}=await createAdminClient().rpc("check_mini_study",{learner_uuid:actor.id,session_uuid:sessionId,grade_value:grade,target_value:target});
    if(error) return {ok:false,message:"Your answers could not be saved. Keep this page open and try again."};
    return {ok:true,grade:data};
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
