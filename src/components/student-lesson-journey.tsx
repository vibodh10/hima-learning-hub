"use client";

import Link from "next/link";
import { useState } from "react";
import { capitaliseFirst } from "@/lib/display-text";

type Screen = {
  id:string; title:string; body:string; example:string|null; codeSample:string|null;
  definition:string|null; commonMistake:string|null; rememberText:string|null;
};
type Example = {
  id:string; title:string; skill:string; problem:string; plan:string; steps:string[];
  codeSample:string|null; expectedOutput:string|null; commonError:string|null;
};
type Activity = {
  id:string; title:string; label:string; pathway:string; instructions:string|null;
  minutes:number; questionCount:number; required:boolean; status:string; open:boolean;
};

export function StudentLessonJourney({lessonId,remember,objectives,screens,examples,activities,reflection}:{
  lessonId:string; remember:string; objectives:string[]; screens:Screen[]; examples:Example[];
  activities:Activity[]; reflection:string|null;
}){
  const stages=[
    {kind:"intro" as const},
    ...screens.map((item,index)=>({kind:"screen" as const,item,index})),
    ...examples.map((item,index)=>({kind:"example" as const,item,index})),
    ...activities.map((item,index)=>({kind:"activity" as const,item,index})),
  ];
  const [position,setPosition]=useState(0);
  const stage=stages[position];
  const move=(next:number)=>{setPosition(Math.max(0,Math.min(stages.length-1,next)));window.scrollTo({top:0,behavior:"smooth"});};

  return <div className="mx-auto mt-8 max-w-3xl">
    <div className="mb-5 flex items-center gap-4 text-sm font-bold" aria-label={`Step ${position+1} of ${stages.length}`}><span>{position+1} of {stages.length}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-teal-600" style={{width:`${((position+1)/stages.length)*100}%`}}/></div></div>
    {stage.kind==="intro"&&<section className="card border-teal-200 bg-teal-50"><p className="eyebrow">First, remember this</p><h2 className="mt-3 text-2xl font-bold leading-9">{remember}</h2>{objectives.length>0&&<details className="mt-5 rounded-xl bg-white p-4"><summary className="cursor-pointer font-semibold">What I will learn</summary><ul className="mt-3 grid gap-2">{objectives.map(item=><li key={item}>✓ {item}</li>)}</ul></details>}<button className="button mt-6" type="button" onClick={()=>move(1)}>{screens.length?"Start the short lesson":"Continue"} →</button></section>}
    {stage.kind==="screen"&&<article className="card"><p className="eyebrow">Learn · screen {stage.index+1} of {screens.length}</p><h2 className="mt-3 text-3xl font-bold">{capitaliseFirst(stage.item.title)}</h2><p className="mt-5 leading-7 text-slate-700">{stage.item.body}</p>{stage.item.definition&&<p className="mt-4 rounded-xl bg-teal-50 p-4"><strong>Definition:</strong> {stage.item.definition}</p>}{stage.item.codeSample&&<pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-5 text-sm text-slate-50"><code>{stage.item.codeSample}</code></pre>}{stage.item.example&&<p className="mt-4 rounded-xl bg-slate-50 p-4"><strong>Example:</strong> {stage.item.example}</p>}{stage.item.commonMistake&&<details className="mt-4 rounded-xl bg-amber-50 p-4 text-amber-950"><summary className="cursor-pointer font-semibold">A common mistake to avoid</summary><p className="mt-2">{stage.item.commonMistake}</p></details>}{stage.item.rememberText&&<p className="mt-4 border-l-4 border-teal-600 pl-4 font-semibold">{stage.item.rememberText}</p>}<Controls position={position} total={stages.length} move={move}/></article>}
    {stage.kind==="example"&&<article className="card"><p className="eyebrow">Worked example {stage.index+1} of {examples.length}</p><h2 className="mt-3 text-3xl font-bold">{capitaliseFirst(stage.item.title)}</h2>{stage.item.skill&&<p className="mt-2 text-sm font-semibold text-teal-800">{capitaliseFirst(stage.item.skill)}</p>}<p className="mt-5"><strong>Problem:</strong> {stage.item.problem}</p><p className="mt-3"><strong>Plan:</strong> {stage.item.plan}</p><ol className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-5">{stage.item.steps.map((item,index)=><li key={`${index}-${item}`}><strong>{index+1}.</strong> {item}</li>)}</ol>{stage.item.codeSample&&<pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-5 text-sm text-slate-50"><code>{stage.item.codeSample}</code></pre>}{stage.item.expectedOutput&&<pre className="mt-4 whitespace-pre-wrap rounded-xl border border-slate-200 p-4 text-sm"><strong>Expected output{"\n"}</strong>{stage.item.expectedOutput}</pre>}{stage.item.commonError&&<details className="mt-4 rounded-xl bg-amber-50 p-4 text-amber-950"><summary className="cursor-pointer font-semibold">What should I watch for?</summary><p className="mt-2">{stage.item.commonError}</p></details>}<Controls position={position} total={stages.length} move={move}/></article>}
    {stage.kind==="activity"&&<article className={`card ${stage.item.open?"border-teal-200 bg-teal-50":"bg-slate-50"}`}><p className="eyebrow">Your next activity · {stage.index+1} of {activities.length}</p><h2 className="mt-3 text-3xl font-bold">{capitaliseFirst(stage.item.title)}</h2><p className="mt-3 leading-7 text-slate-700">{stage.item.instructions}</p><p className="mt-4 text-sm font-semibold">{stage.item.label} · {stage.item.questionCount} questions · about {stage.item.minutes} minutes</p><p className="mt-2 text-sm text-slate-600">{stage.item.required?"Required":"Optional"} · {stage.item.pathway} pathway</p><span className={`mt-4 inline-flex rounded-full px-3 py-2 text-sm font-bold ${stage.item.open?"bg-white text-teal-900":"bg-slate-200 text-slate-700"}`}>{stage.item.status}</span>{stage.item.open?<Link className="button mt-6 block w-fit" href={`/learn/${lessonId}/activities/${stage.item.id}`}>Open this activity →</Link>:<p className="mt-5 font-semibold text-slate-700">Complete the earlier activity first.</p>}{reflection&&stage.index===activities.length-1&&<details className="mt-5 rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer font-semibold">Reflection question</summary><p className="mt-3">{reflection}</p></details>}<Controls position={position} total={stages.length} move={move}/></article>}
  </div>;
}

function Controls({position,total,move}:{position:number;total:number;move:(next:number)=>void}){
  return <div className="mt-6 flex flex-wrap gap-3">{position<total-1&&<button className="button" type="button" onClick={()=>move(position+1)}>Continue →</button>}{position>0&&<button className="button-secondary" type="button" onClick={()=>move(position-1)}>Back</button>}</div>;
}
