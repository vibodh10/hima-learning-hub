"use client";

import Link from "next/link";
import {topicHref} from "@/lib/learning-catalog";
import type {PearsonUnit} from "@/lib/pearson-curriculum";
import type {AtomAttemptSummary} from "@/lib/atom-attempts-server";
import {capitaliseFirst} from "@/lib/display-text";

export function AtomProgressDashboard({units,initialAttempts=[]}:{units:PearsonUnit[];initialAttempts?:AtomAttemptSummary[]}){
 const rows=units.flatMap(unit=>unit.topics.map(topic=>{const server=initialAttempts.find(item=>item.kind==="topic_practice"&&item.unitCode===unit.code&&item.topicCode===topic.code);return{unit,topic,evidence:server?{practiceScore:server.percentage,hintsUsed:server.hintsUsed}:{}}}));
 const papers=initialAttempts.filter(item=>item.kind==="practice_paper");
 const attempted=rows.filter(row=>row.evidence.practiceScore!=null);
 const average=attempted.length?Math.round(attempted.reduce((sum,row)=>sum+(row.evidence.practiceScore??0),0)/attempted.length):0;
 const strong=rows.filter(row=>(row.evidence.practiceScore??0)>=75);
 const needs=attempted.filter(row=>(row.evidence.practiceScore??0)<75).sort((a,b)=>(a.evidence.practiceScore??0)-(b.evidence.practiceScore??0));
 return <div className="grid gap-7">
  <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Fact label="Overall accuracy" value={`${average}%`}/><Fact label="Topics practised" value={`${attempted.length}/${rows.length}`}/><Fact label="Strong topics" value={String(strong.length)}/><Fact label="Need practice" value={String(needs.length)}/></section>
  <section className="grid gap-6 lg:grid-cols-2">
   <div className="card"><p className="eyebrow">Your next steps</p><h2 className="mt-2 text-2xl font-bold">What to work on now</h2>{needs.length?<div className="mt-5 grid gap-3">{needs.slice(0,5).map(row=><Link className="rounded-xl border border-amber-200 bg-amber-50 p-4" href={`${topicHref(row.unit.code,row.topic.code)}/practice`} key={`${row.unit.code}:${row.topic.code}`}><span className="text-xs font-bold uppercase">Unit {row.unit.code} · {row.evidence.practiceScore}%</span><strong className="mt-1 block">{capitaliseFirst(row.topic.title)}</strong><span className="mt-1 block text-sm">Review the explanation, then answer a fresh set →</span></Link>)}</div>:<p className="mt-5 rounded-xl bg-blue-50 p-4">Complete a topic practice session and your targeted recommendations will appear here.</p>}</div>
   <div className="card"><p className="eyebrow">Strengths</p><h2 className="mt-2 text-2xl font-bold">Topics looking secure</h2>{strong.length?<div className="mt-5 grid gap-3">{strong.slice(0,6).map(row=><div className="rounded-xl bg-teal-50 p-4" key={`${row.unit.code}:${row.topic.code}`}><span className="text-xs font-bold uppercase text-teal-800">Unit {row.unit.code} · {row.evidence.practiceScore}%</span><strong className="mt-1 block">{capitaliseFirst(row.topic.title)}</strong></div>)}</div>:<p className="mt-5 text-slate-600">Score 75% or more in topic practice to build this list.</p>}</div>
  </section>
  <section className="card"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">By unit</p><h2 className="mt-2 text-2xl font-bold">Course progress</h2></div><span className="text-sm text-slate-600">Based on marked question sessions, not page views</span></div><div className="mt-5 grid gap-4">{units.map(unit=>{const unitRows=rows.filter(row=>row.unit.code===unit.code),done=unitRows.filter(row=>row.evidence.practiceScore!=null).length,unitAverage=done?Math.round(unitRows.reduce((sum,row)=>sum+(row.evidence.practiceScore??0),0)/done):0;return <div className="rounded-xl border border-slate-200 p-4" key={unit.code}><div className="flex justify-between gap-4"><div><strong>Unit {unit.code}: {unit.title}</strong><p className="mt-1 text-sm text-slate-600">{done}/{unitRows.length} topics practised · {unitAverage}% average</p></div><Link className="link text-sm" href={`/curriculum/units/${unit.code}`}>Open unit →</Link></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-teal-600" style={{width:`${done/unitRows.length*100}%`}}/></div></div>})}</div></section>
  <section className="card"><p className="eyebrow">Paper history</p><h2 className="mt-2 text-2xl font-bold">Your recent practice papers</h2><div className="mt-5 grid gap-3">{papers.length?papers.slice(0,8).map(paper=><div className="rounded-xl bg-slate-50 p-4" key={paper.id}><div className="flex flex-wrap justify-between gap-3"><span><strong>Unit {paper.unitCode}</strong> · {paper.paperMode??"applied"} · {new Date(paper.completedAt).toLocaleDateString("en-GB")}</span><span className="font-bold">{paper.hasSubmittedResponses&&paper.teacherMark==null?"Awaiting teacher review":`${paper.percentage}% · ${paper.mark}/${paper.maxMark} marks`} · {Math.round(paper.activeSeconds/60)} min</span></div>{paper.teacherFeedback&&<p className="mt-3 border-t border-teal-200 pt-3 text-sm text-teal-950"><strong>Teacher feedback:</strong> {paper.teacherFeedback}</p>}</div>):<p className="text-slate-600">No signed-in practice-paper attempts recorded yet.</p>}</div></section>
 </div>;
}

function Fact({label,value}:{label:string;value:string}){return <div className="card"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>}
