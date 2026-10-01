"use client";
import {useState,useTransition} from "react";
import {submitSowFormativeAssessment} from "@/app/actions/sow-assessments";

export function SowFormativeStudentForm({assessmentId,questions,initialResponses,submittedAt}:{assessmentId:string;questions:string[];initialResponses:string[];submittedAt:string|null}){
 const [responses,setResponses]=useState(questions.map((_,i)=>initialResponses[i]??""));const [message,setMessage]=useState("");const [pending,startTransition]=useTransition();
 function submit(){startTransition(async()=>{const result=await submitSowFormativeAssessment({assessmentId,responses});setMessage(result.message);});}
 return <section className="mt-6">
  {submittedAt&&<p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">Submitted previously. You can improve your answers and submit again before your tutor reviews them.</p>}
  <div className="mt-4 grid gap-5">{questions.map((question,index)=><label className="card grid gap-3" key={index}><span className="font-bold">{index+1}. {question}</span><textarea className="input min-h-32" value={responses[index]} onChange={e=>setResponses(current=>current.map((value,i)=>i===index?e.target.value:value))}/></label>)}</div>
  <button type="button" className="button mt-5" disabled={pending||responses.some(value=>!value.trim())} onClick={submit}>{pending?"Submitting...":"Submit assessment"}</button>
  {message&&<p className="mt-4 text-sm font-semibold">{message}</p>}
 </section>;
}