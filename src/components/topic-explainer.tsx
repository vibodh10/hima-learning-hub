"use client";

import {useEffect,useMemo,useState} from "react";
import type {TeachingCard} from "@/lib/btec-teaching";

type Scene={label:string;title:string;body:string;example?:string;check?:string;answer?:string};

export function TopicExplainer({topicTitle,cards}:{topicTitle:string;cards:TeachingCard[]}){
  const scenes=useMemo(()=>buildScenes(topicTitle,cards),[topicTitle,cards]);
  const[index,setIndex]=useState(0),[playing,setPlaying]=useState(false),[answerShown,setAnswerShown]=useState(false),[reducedMotion,setReducedMotion]=useState(false);
  useEffect(()=>{if(!window.matchMedia)return;const query=window.matchMedia("(prefers-reduced-motion: reduce)");const update=()=>setReducedMotion(query.matches);update();query.addEventListener("change",update);return()=>query.removeEventListener("change",update)},[]);
  useEffect(()=>{if(!playing||reducedMotion)return;const timer=window.setTimeout(()=>{if(index>=scenes.length-1)setPlaying(false);else{setIndex(value=>value+1);setAnswerShown(false)}},12000);return()=>window.clearTimeout(timer)},[index,playing,reducedMotion,scenes.length]);
  const scene=scenes[index];
  const move=(next:number)=>{setIndex(Math.max(0,Math.min(scenes.length-1,next)));setAnswerShown(false)};
  return <section className="card border-blue-200" aria-labelledby="visual-explainer-title"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Short teaching video</p><h2 className="mt-2 text-2xl font-bold" id="visual-explainer-title">{topicTitle} visual explainer</h2><p className="mt-2 text-sm text-slate-600">Six focused, captioned scenes: what it is, why it matters, how it works, a worked example, a common mistake and a quick check.</p></div><span className="rounded-full bg-blue-100 px-3 py-2 text-sm font-bold text-blue-900">About 2 minutes</span></div>
    <div className="mt-5 overflow-hidden rounded-2xl bg-slate-950 text-white"><div className="h-2 bg-slate-700"><div className="h-full bg-teal-400 transition-[width]" style={{width:`${((index+1)/scenes.length)*100}%`}}/></div><div className="min-h-80 p-7 sm:p-10" aria-live="polite"><p className="text-xs font-bold uppercase tracking-widest text-teal-300">Scene {index+1} of {scenes.length} · {scene.label}</p><h3 className="mt-4 text-3xl font-bold">{scene.title}</h3><p className="mt-5 max-w-3xl text-lg leading-8 text-slate-200">{scene.body}</p>{scene.example&&<div className="mt-6 rounded-xl border border-blue-400 bg-blue-950 p-5"><p className="text-xs font-bold uppercase tracking-wide text-blue-200">Worked visual</p><p className="mt-2 leading-7">{scene.example}</p></div>}{scene.check&&<div className="mt-6 rounded-xl bg-white p-5 text-slate-950"><p className="font-bold">Quick check</p><p className="mt-2">{scene.check}</p>{answerShown?<p className="mt-3 rounded-lg bg-teal-50 p-3 text-sm"><strong>Check answer:</strong> {scene.answer}</p>:<button className="button-secondary button-small mt-3" type="button" onClick={()=>setAnswerShown(true)}>Reveal answer</button>}</div>}</div></div>
    <div className="mt-4 flex flex-wrap items-center gap-3"><button className="button-secondary button-small" type="button" onClick={()=>move(index-1)} disabled={index===0}>Previous</button><button className="button button-small" type="button" onClick={()=>setPlaying(value=>!value)} disabled={reducedMotion}>{playing?"Pause":"Play visual explainer"}</button><button className="button-secondary button-small" type="button" onClick={()=>move(index+1)} disabled={index===scenes.length-1}>Next</button><button className="link ml-auto text-sm" type="button" onClick={()=>{move(0);setPlaying(false)}}>Restart</button></div>{reducedMotion&&<p className="mt-3 text-sm text-slate-600">Motion is reduced on this device. Use Previous and Next to move through the same captioned content.</p>}
    <details className="mt-5 rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer font-semibold">Read the full transcript</summary><ol className="mt-4 grid gap-4">{scenes.map((item,sceneIndex)=><li key={`${item.label}-${sceneIndex}`}><strong>{sceneIndex+1}. {item.title}</strong><p className="mt-1 text-sm leading-6 text-slate-700">{item.body} {item.example??""}</p></li>)}</ol></details>
  </section>;
}

function buildScenes(topicTitle:string,cards:TeachingCard[]):Scene[]{
  const orientation=cards[0],concept=cards.find(card=>card.id.startsWith("concept"))??orientation;
  const secondConcept=cards.filter(card=>card.id.startsWith("concept"))[1]??concept;
  const worked=cards.find(card=>card.id==="worked")??cards.at(-2)??orientation;
  const assessment=cards.find(card=>card.id==="assessment")??cards.at(-1)??orientation;
  return [
    {label:"What is it?",title:topicTitle,body:orientation.points.map(point=>point.explanation).join(" "),example:orientation.points[0]?.example},
    {label:"Why is it used?",title:orientation.purpose,body:concept.points.map(point=>`${point.concept}: ${point.explanation}`).join(" "),example:concept.points[0]?.example},
    {label:"How does it work?",title:concept.title,body:secondConcept.points.map(point=>`${point.concept}: ${point.explanation}`).join(" "),example:secondConcept.points[0]?.example},
    {label:"Worked example",title:worked.title,body:worked.points.map(point=>point.explanation).join(" "),example:worked.workedSteps?.map((step,index)=>`${index+1}. ${step}`).join(" ")??worked.points[0]?.example},
    {label:"Common mistake",title:"Avoid this error",body:worked.misconception,example:`Better approach: ${worked.checkAnswer}`},
    {label:"Quick check",title:assessment.title,body:assessment.purpose,check:assessment.checkQuestion,answer:assessment.checkAnswer},
  ];
}
