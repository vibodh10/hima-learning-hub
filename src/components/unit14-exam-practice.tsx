"use client";
import {useActionState,useState} from "react";
import {submitExamPractice,reflectExamPractice} from "@/app/actions/exam-practice";
import {unit14Activities,unit14Papers} from "@/lib/unit14-exam";
import {unit14Models,unit14PracticeScenario} from "@/lib/unit14-models";

export function Unit14ExamPractice({classId,staff=false}:{classId:string;staff?:boolean}){
 const [attempt,setAttempt]=useState(0);
 return <PracticeAttempt key={attempt} classId={classId} staff={staff} restart={()=>setAttempt(value=>value+1)}/>;
}
function PracticeAttempt({classId,staff,restart}:{classId:string;staff:boolean;restart:()=>void}){
 const [paper,setPaper]=useState("guided");const [activity,setActivity]=useState(0);
 const [state,action,pending]=useActionState(submitExamPractice,{});
 const [review,reviewAction,reviewPending]=useActionState(reflectExamPractice,{});
 const [preview,setPreview]=useState(false);const [response,setResponse]=useState("");const [reflection,setReflection]=useState("");
 const revealed=Boolean(state.ok||preview);const model=unit14Models[activity];
 const chosen=unit14Papers.find(p=>p.id===paper);
 return <section className="mini-study-panel mt-6"><h2 className="text-2xl font-bold">Write first, then review</h2>
 <p>Choose one activity. For timed practice, agree a time limit with your teacher and record it in your response. A full mock follows the chosen paper&apos;s instructions.</p>
 <form action={action} className="grid gap-4">
 <input type="hidden" name="classId" value={classId}/>
 <label>Practice source<select className="input w-full" name="paper" value={paper} disabled={revealed||pending} onChange={e=>setPaper(e.target.value)}><option value="guided">Original guided scenario</option>{unit14Papers.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
 <label>Activity<select className="input w-full" name="activity" value={activity} disabled={revealed||pending} onChange={e=>setActivity(Number(e.target.value))}>{unit14Activities.map((a,i)=><option key={a} value={i}>{i+1}. {a}</option>)}</select></label>
 {paper==="guided"?<><aside className="mini-study-example"><h3 className="font-bold">Riverside Leisure</h3><p>{unit14PracticeScenario}</p></aside><p className="font-bold">{model.task}</p></>:<div><p>Use the question-only copy of {chosen?.title} supplied by your teacher. Read its scenario and answer activity {activity+1} from that paper. Use the matching Part A and templates. Paste your response here; retain diagrams and formatted templates in your own files.</p>{chosen?.links.filter(l=>!l.title.includes("scheme")&&!l.title.includes("report")).map(l=><p key={l.url}><a className="link" href={l.url} target="_blank" rel="noreferrer">{l.title}</a></p>)}</div>}
 <label>Your own answer<textarea className="input w-full min-h-56" name="response" value={response} onChange={e=>setResponse(e.target.value)} minLength={40} maxLength={50000} required readOnly={revealed} placeholder="Apply your answer to the organisation. Explain your reasons and any limitations."/></label>
 {!revealed&&!staff&&<button className="mini-study-primary" disabled={pending}>{pending?"Saving…":"Save my answer and show the review"}</button>}
 {staff&&!revealed&&<button className="button-secondary" type="button" onClick={()=>setPreview(true)}>Preview the review as a teacher</button>}
 {state.message&&<p role="status">{state.message}</p>}
 </form>
 {revealed&&<div className="mt-6 border-t pt-5">
 {paper==="guided"?<><h3 className="text-xl font-bold">One strong approach</h3><p>This is an original teaching example, not an official Pearson answer or a guaranteed full-mark response. Other justified designs can work.</p><p>{model.model}</p><h4 className="font-bold">Compare your answer</h4><ul className="list-disc pl-6">{model.checks.map(c=><li key={c}>{c}</li>)}</ul></>:<><h3 className="text-xl font-bold">Review your response</h3><p>Check that your answer addresses the task and explains your reasons. Hima or Lee will use the marking guidance to review your work. Mark schemes are available in the teacher resource section only.</p></>}
 <p>Find one strength, one missing or weak point, and rewrite the part you would improve. You can ask Hima or Lee if you are unsure.</p>
 {!staff&&<form action={reviewAction}><input type="hidden" name="id" value={state.id}/><label>My review and improved paragraph<textarea className="input w-full min-h-36" name="reflection" value={reflection} onChange={e=>setReflection(e.target.value)} minLength={20} maxLength={6000} required/></label><button className="mini-study-primary" disabled={reviewPending}>{reviewPending?"Saving…":"Save my review"}</button>{review.message&&<p role="status">{review.message}</p>}</form>}
 <p className="text-sm">Self-review records effort and reflection. It does not award exam marks or XP.</p>
 <button className="button-secondary" type="button" onClick={restart}>Start a fresh attempt</button>
 </div>}
 </section>;
}

export function ExamReflectionForm({id,initial=""}:{id:string;initial?:string}){
 const [state,action,pending]=useActionState(reflectExamPractice,{});const [reflection,setReflection]=useState(initial);
 return <form action={action}><input name="id" type="hidden" value={id}/><label>My review and improved paragraph<textarea name="reflection" className="input w-full min-h-36" value={reflection} onChange={e=>setReflection(e.target.value)} minLength={20} maxLength={6000} required/></label><button className="button" disabled={pending}>Save my review</button>{state.message&&<p role="status">{state.message}</p>}</form>;
}

