"use client";

import {useActionState} from "react";
import {reviewCurriculumAttempt,type CurriculumReviewState} from "@/app/actions/atom-learning";

export function CurriculumAttemptReviewForm({attemptId,learnerId,maxMark,currentMark,currentFeedback}:{attemptId:string;learnerId:string;maxMark:number;currentMark:number|null;currentFeedback:string|null}){
 const[state,action,pending]=useActionState<CurriculumReviewState,FormData>(reviewCurriculumAttempt,{});
 return <form action={action} className="mt-4 grid gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
  <input type="hidden" name="attemptId" value={attemptId}/><input type="hidden" name="learnerId" value={learnerId}/>
  <div className="grid gap-3 sm:grid-cols-[10rem_1fr]"><label className="grid gap-1 text-sm font-bold">Final mark / {maxMark}<input className="input" name="mark" type="number" min="0" max={maxMark} defaultValue={currentMark??""} required/></label><label className="grid gap-1 text-sm font-bold">Teacher feedback<textarea className="input min-h-24" name="feedback" defaultValue={currentFeedback??""} required/></label></div>
  {state.errors?.mark?.[0]&&<p className="text-sm text-red-700">{state.errors.mark[0]}</p>}{state.errors?.feedback?.[0]&&<p className="text-sm text-red-700">{state.errors.feedback[0]}</p>}
  <button className="button justify-self-start" disabled={pending}>{pending?"Saving review…":currentMark==null?"Publish final mark":"Update final mark"}</button>
  {state.message&&<p role="status" className={`text-sm ${state.ok?"text-teal-800":"text-red-700"}`}>{state.message}</p>}
 </form>;
}
