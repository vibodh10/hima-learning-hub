"use client";
import {useActionState,useState} from "react";
import {submitExamPractice,reflectExamPractice} from "@/app/actions/exam-practice";
import {unit2PracticeActivities,unit2PracticeScenarios} from "@/lib/unit2-exam";

export function Unit2ExamPractice({classId,staff=false}:{classId:string;staff?:boolean}){
  const [attempt,setAttempt]=useState(0);
  return <Practice key={attempt} classId={classId} staff={staff} restart={()=>setAttempt(v=>v+1)}/>;
}

function Practice({classId,staff,restart}:{classId:string;staff:boolean;restart:()=>void}){
  const [paper,setPaper]=useState(unit2PracticeScenarios[0].id);
  const [activity,setActivity]=useState(0);
  const [response,setResponse]=useState("");
  const [reflection,setReflection]=useState("");
  const [preview,setPreview]=useState(false);
  const [state,action,pending]=useActionState(submitExamPractice,{});
  const [review,reviewAction,reviewPending]=useActionState(reflectExamPractice,{});
  const revealed=Boolean(state.ok||preview);
  const scenario=unit2PracticeScenarios.find(item=>item.id===paper)??unit2PracticeScenarios[0];
  const task=unit2PracticeActivities[activity];

  return <section className="mini-study-panel mt-6">
    <h2 className="text-2xl font-bold">Unit 2 activity practice</h2>
    <p>Start with Activity 1 while that is the class focus, then use the other activities for retrieval and later exam preparation. These are original rehearsal tasks based on the eight-activity evidence pattern already mapped in the Hub, not secure Pearson assessment material.</p>
    <form action={action} className="grid gap-4">
      <input type="hidden" name="classId" value={classId}/>
      <input type="hidden" name="unitCode" value="2"/>
      <label>Practice data set
        <select className="input w-full" name="paper" value={paper} disabled={revealed||pending} onChange={e=>setPaper(e.target.value)}>
          {unit2PracticeScenarios.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </label>
      <label>Activity
        <select className="input w-full" name="activity" value={activity} disabled={revealed||pending} onChange={e=>setActivity(Number(e.target.value))}>
          {unit2PracticeActivities.map((item,index)=><option key={item.number} value={index}>Activity {item.number}. {item.title}</option>)}
        </select>
      </label>

      <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="eyebrow">Practice session {task.session} · Activity {task.number}</p>
        <h3 className="mt-1 text-xl font-bold">{task.title}</h3>
        <p className="mt-2">{task.focus}</p>
      </article>

      {activity===0&&<aside className="mini-study-example">
        <h3 className="font-bold">{scenario.title} · data extract</h3>
        <p>{scenario.note}</p>
        <pre className="mt-3 overflow-x-auto whitespace-pre text-sm"><code>{scenario.extract.join("\n")}</code></pre>
      </aside>}

      <div>
        <h3 className="font-bold">Your task</h3>
        <p className="mt-2">{task.task}</p>
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <h3 className="font-bold">Evidence you should produce</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5">{task.evidence.map(item=><li key={item}>{item}</li>)}</ul>
      </div>

      <label>Your own response / evidence notes
        <textarea className="input min-h-72 w-full" name="response" value={response} onChange={e=>setResponse(e.target.value)} minLength={40} maxLength={50000} required readOnly={revealed}
          placeholder={activity===0?"Write your proposed tables, fields, PKs, FKs, relationships, reasons and the evidence you would capture.":"Write your answer and record the evidence you would produce."}/>
      </label>

      {!revealed&&!staff&&<button className="mini-study-primary" disabled={pending}>{pending?"Saving…":"Save my work and show the review"}</button>}
      {staff&&!revealed&&<button type="button" className="button-secondary" onClick={()=>setPreview(true)}>Preview review checklist as teacher</button>}
      {state.message&&<p role="status">{state.message}</p>}
    </form>

    {revealed&&<div className="mt-6 border-t pt-5">
      <h3 className="text-xl font-bold">Review checklist</h3>
      <p>Compare your work against each point. This is formative practice; it does not award a Pearson mark.</p>
      <ul className="mt-3 list-disc space-y-1 pl-5">{task.review.map(item=><li key={item}>{item}</li>)}</ul>
      <p className="mt-4">Choose one missing or weak point and rewrite that part before you finish.</p>
      {!staff&&<form action={reviewAction} className="mt-3 grid gap-3">
        <input type="hidden" name="id" value={state.id}/>
        <label>My correction / improvement
          <textarea className="input min-h-36 w-full" name="reflection" value={reflection} onChange={e=>setReflection(e.target.value)} minLength={20} maxLength={6000} required/>
        </label>
        <button className="mini-study-primary" disabled={reviewPending}>{reviewPending?"Saving…":"Save my improvement"}</button>
        {review.message&&<p role="status">{review.message}</p>}
      </form>}
      <button className="button-secondary mt-4" type="button" onClick={restart}>Start another activity</button>
    </div>}
  </section>;
}
