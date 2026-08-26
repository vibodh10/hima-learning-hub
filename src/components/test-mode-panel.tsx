"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { resetTestMode, runTestModeAction, type ActionState } from "@/app/actions/learning";
import { AchievementCelebration } from "@/components/achievement-celebration";

export function TestModePanel({
  activityId,nextHref,themePreviews=[],
}:{activityId:string;nextHref?:string;themePreviews?:{id:string;title:string;config:unknown}[]}){
  const[state,action,pending]=useActionState<ActionState,FormData>(runTestModeAction,{});
  const[resetState,resetAction,resetPending]=useActionState<ActionState,FormData>(resetTestMode,{});
  const[celebrate,setCelebrate]=useState(false);
  const[selectedTheme,setSelectedTheme]=useState(themePreviews[0]?.id??"");
  const selectedPreview=themePreviews.find(item=>item.id===selectedTheme);
  const answers=Array.isArray(state.testData)?state.testData as {
    questionId:string;question:string;answer:unknown;acceptableAnswers:unknown;explanation:string;
  }[]:[];
  return <aside className="mt-8 rounded-2xl border-2 border-fuchsia-500 bg-fuchsia-50 p-5 text-fuchsia-950">
    <p className="text-sm font-black uppercase tracking-widest">Staff preview</p>
    <h2 className="mt-1 text-xl font-bold">Preview this activity without creating learner results</h2>
    <p className="mt-2 text-sm">These controls write only to your isolated staff preview. They do not create a student account or change learner progress, pathways, homework, interventions, permanent coins, streaks, or inspection evidence.</p>
    <form action={action} className="mt-5 grid gap-3">
      <input type="hidden" name="activityId" value={activityId}/>
      <div className="flex flex-wrap gap-2">
        <SimulationButton event="answer_revealed" label="Reveal expected answers" disabled={pending}/>
        <SimulationButton event="simulated_correct" label="Simulate correct answer" disabled={pending}/>
        <SimulationButton event="simulated_incorrect" label="Simulate incorrect answer" disabled={pending}/>
        <SimulationButton event="target_achieved" label="Simulate target achieved" disabled={pending}/>
        <SimulationButton event="badge_awarded" label="Preview badge" disabled={pending}/>
        <SimulationButton event="coins_awarded" label="Simulate coin award" disabled={pending}/>
        <SimulationButton event="reward_purchased" label="Simulate reward purchase" disabled={pending}/>
        <SimulationButton event="reward_equipped" label="Preview owned theme" disabled={pending}/>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold">Simulated percentage<input className="input" type="number" name="percentage" min="0" max="100" defaultValue="75"/></label>
        <label className="grid gap-1 text-sm font-semibold">Simulated pathway<select className="input" name="pathway" defaultValue="Core">{["Support","Core","Stretch","Mastery"].map(value=><option key={value}>{value}</option>)}</select></label>
      </div>
      <button className="button-secondary justify-self-start" name="event" value="simulated_percentage" disabled={pending}>Simulate selected outcome</button>
      {state.message&&<p role="status" className={`text-sm ${state.ok?"text-fuchsia-900":"text-red-700"}`}>{state.message}</p>}
    </form>
    {answers.length>0&&<div className="mt-5 grid gap-3">{answers.map((item,index)=><div className="rounded-xl bg-white p-4" key={item.questionId}><p className="font-semibold">{index+1}. {item.question}</p><p className="mt-2 text-sm"><strong>Expected:</strong> {formatValue(item.answer)}</p><p className="mt-1 text-sm">{item.explanation}</p></div>)}</div>}
    {themePreviews.length>0&&<div className="mt-5 rounded-xl bg-white p-4"><label className="text-sm font-semibold">Preview available theme<select className="input mt-1" value={selectedTheme} onChange={event=>setSelectedTheme(event.target.value)}>{themePreviews.map(item=><option value={item.id} key={item.id}>{item.title}</option>)}</select></label><div className="mt-3 rounded-xl border border-cyan-200 p-5" style={previewStyle(selectedPreview?.config)}><strong>{selectedPreview?.title}</strong><p className="mt-1 text-sm">Sandbox visual preview with no coins charged and no learner setting changed.</p></div></div>}
    <div className="mt-5 flex flex-wrap gap-3">
      {nextHref&&<Link className="button" href={nextHref}>Next activity without submitting →</Link>}
      <button className="button-secondary" type="button" onClick={()=>setCelebrate(true)}>Preview Achievement Notification / Trigger Confetti</button>
      <form action={resetAction}><button className="button-secondary" disabled={resetPending}>{resetPending?"Resetting…":"Clear preview activity"}</button></form>
    </div>
    {resetState.message&&<p className="mt-3 text-sm" role="status">{resetState.message}</p>}
    {celebrate&&<AchievementCelebration title="Python Explorer" reason="Staff preview after completing the Python mastery check." onClose={()=>setCelebrate(false)} preview/>}
  </aside>;
}

function SimulationButton({event,label,disabled}:{event:string;label:string;disabled:boolean}){
  return <button className="button-secondary" name="event" value={event} disabled={disabled}>{label}</button>;
}
function formatValue(value:unknown){return Array.isArray(value)?value.join(", "):typeof value==="object"?JSON.stringify(value):String(value)}
function previewStyle(value:unknown):React.CSSProperties{
  const config=value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
  if(config.theme==="ocean")return{background:"linear-gradient(145deg,#ecfeff,#dbeafe,#ccfbf1)"};
  return{background:"#f8fafc"};
}
