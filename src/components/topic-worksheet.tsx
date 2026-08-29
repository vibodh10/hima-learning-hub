"use client";

import { useActionState } from "react";
import { submitTopicWorksheet, type WorksheetState } from "@/app/actions/worksheets";

export function TopicWorksheet({
  unitCode,
  topicCode,
  topicTitle,
  catchUp,
  evidenceStage,
}: {
  unitCode: "2" | "4" | "6" | "10" | "14";
  topicCode: string;
  topicTitle: string;
  catchUp: boolean;
  evidenceStage: "before" | "learning" | "progress_check_1" | "progress_check_2" | "after";
}) {
  const [state, action, pending] = useActionState<WorksheetState, FormData>(submitTopicWorksheet, {});
  const stageLabel = evidenceStage === "before" ? "Before-learning evidence"
    : evidenceStage === "after" ? "After-learning evidence"
    : evidenceStage.startsWith("progress_check") ? evidenceStage.replaceAll("_", " ")
    : catchUp ? "Structured catch-up" : "In-portal worksheet";
  return <section className="card" id="worksheet" aria-labelledby="worksheet-title">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">{stageLabel}</p><h2 className="mt-2 text-2xl font-bold" id="worksheet-title">{topicTitle}</h2><p className="mt-2 text-sm text-slate-600">Your submission is retained as a new evidence version. Returning later never overwrites your earlier work.</p></div><span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-bold">Unit {unitCode} · {topicCode}</span></div>
    {evidenceStage!=="learning"&&<p className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">This is a teaching-sequence milestone. Submit your own work so it can be compared with separately preserved evidence from another stage.</p>}
    {catchUp&&<div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"><p className="font-bold">Missed this lesson?</p><ol className="mt-3 grid gap-2"><li>1. Read the short guided explanation above at your own pace.</li><li>2. Complete the recap.</li><li>3. Complete this worksheet.</li><li>4. Complete the practical application.</li><li>5. Complete the knowledge check.</li><li>6. Record your reflection and exit ticket.</li></ol></div>}
    <form action={action} className="mt-6 grid gap-6">
      <input type="hidden" name="unitCode" value={unitCode}/><input type="hidden" name="topicCode" value={topicCode}/><input type="hidden" name="mode" value={catchUp?"catch_up":"standard"}/><input type="hidden" name="evidenceStage" value={evidenceStage}/>
      <WorksheetSection number="1" title="Recap: What do I already know?" name="recap" prompt="Record the terms, methods or examples you can recall before reviewing the lesson."/>
      <WorksheetSection number="2" title="Learning objectives" name="objectives" prompt="Which objective are you working towards, and what would successful evidence look like?"/>
      <WorksheetSection number="3" title="Key knowledge" name="keyKnowledge" prompt="Summarise the essential ideas in your own words."/>
      <WorksheetSection number="4" title="Worked example" name="workedExample" prompt="Explain the worked process and identify the decision that matters most."/>
      <WorksheetSection number="5" title="Main task" name="mainTask" prompt="Record your response, method, design, code or link to the work completed."/>
      <WorksheetSection number="6" title="Practical application" name="practicalApplication" prompt="Apply the learning to the vocational scenario and record the evidence produced."/>
      <WorksheetSection number="7" title="Challenge / stretch" name="challenge" prompt="Try the less familiar scenario, alternative method or evaluation task."/>
      <WorksheetSection number="8" title="Knowledge check" name="knowledgeCheck" prompt="Record your answer and the evidence you used to check it."/>
      <WorksheetSection number="9" title="Feedback / checking" name="feedbackChecking" prompt="What did the system, worked answer, peer or teacher checking show?"/>
      <WorksheetSection number="10" title="Improvement task" name="improvement" prompt="What did you change after checking, and why is the revised work better?"/>
      <fieldset className="rounded-2xl border border-slate-200 p-5"><legend className="px-2 font-bold">11. Reflection</legend><div className="mt-2 grid gap-4 md:grid-cols-2"><WorksheetField label="Today I can..." name="todayCan"/><WorksheetField label="I found this difficult..." name="difficult"/><WorksheetField label="I improved..." name="improved"/><WorksheetField label="I still need help with..." name="help"/></div><label className="mt-4 grid gap-2 text-sm font-semibold">My confidence (1-5)<select className="input max-w-40" name="confidence" required defaultValue="3">{[1,2,3,4,5].map(value=><option value={value} key={value}>{value}</option>)}</select></label></fieldset>
      <WorksheetSection number="12" title="Exit ticket" name="exitTicket" prompt="State one thing you can now do and the most useful next step."/>
      <button className="button justify-self-start" disabled={pending}>{pending?"Saving evidence…":catchUp?"Complete catch-up worksheet":"Save worksheet to portfolio"}</button>
      {state.message&&<p role="status" className={`rounded-xl p-4 text-sm ${state.ok?"bg-teal-50 text-teal-900":"bg-red-50 text-red-800"}`}>{state.message}</p>}
    </form>
  </section>;
}

function WorksheetSection({number,title,name,prompt}:{number:string;title:string;name:string;prompt:string}) { return <label className="grid gap-2 text-sm font-semibold"><span>{number}. {title}</span><span className="font-normal text-slate-600">{prompt}</span><textarea className="input min-h-28" name={name} maxLength={6000}/></label>; }
function WorksheetField({label,name}:{label:string;name:string}) { return <label className="grid gap-2 text-sm font-semibold">{label}<textarea className="input min-h-24" name={name} maxLength={6000}/></label>; }
