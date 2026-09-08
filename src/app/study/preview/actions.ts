"use server";
import {gradeStudy,studyDay,nextStudyDay,studyQuestionSet,type StudyResult,type StudyReward} from "@/lib/mini-study";
import {unit6StudyBaseline,unit6StudyLessons} from "@/lib/mini-study-content";

/** Development-only visual QA uses original public lesson content and writes no learner records. */
export async function checkPreviewStudy(sessionId:string,responses:unknown):Promise<StudyResult> {
  if(process.env.NODE_ENV!=="development") return {ok:false,message:"Preview is unavailable."};
  const keys=sessionId==="baseline-preview"?unit6StudyBaseline:sessionId==="recap-preview"?studyQuestionSet(unit6StudyLessons[1],unit6StudyLessons[0]):unit6StudyLessons[0].questions;
  const grade=gradeStudy(keys,responses);
  return grade?{ok:true,grade}:{ok:false,message:"Complete each question and use each matching answer once."};
}

export async function finishPreviewStudy():Promise<{ok:true;reward:StudyReward}|{ok:false;message:string}> {
  return process.env.NODE_ENV==="development"?{ok:true,reward:{xp:20,badge:"Preview badge",nextOn:nextStudyDay(studyDay(new Date()))}}:{ok:false,message:"Preview is unavailable."};
}
