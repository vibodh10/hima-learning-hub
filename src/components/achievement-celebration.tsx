"use client";

import { useEffect, useState } from "react";
import { markBadgeNotificationsSeen } from "@/app/actions/learning";

export function AchievementCelebration({
  title,reason,onClose,awardIds=[],preview=false,
}:{title:string;reason:string;onClose?:()=>void;awardIds?:string[];preview?:boolean}){
  const[reducedMotion,setReducedMotion]=useState(true);
  const[celebrationEffect,setCelebrationEffect]=useState("");
  useEffect(()=>{
    const media=window.matchMedia("(prefers-reduced-motion: reduce)");
    const update=()=>setReducedMotion(media.matches);
    update();
    queueMicrotask(()=>setCelebrationEffect(document.body.dataset.celebrationEffect??""));
    media.addEventListener("change",update);
    return()=>media.removeEventListener("change",update);
  },[]);
  function close(){
    if(!preview&&awardIds.length)void markBadgeNotificationsSeen(awardIds);
    onClose?.();
  }
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-5" role="dialog" aria-modal="true" aria-labelledby="achievement-title">
    {!reducedMotion&&<div className="confetti-layer" aria-hidden="true">{Array.from({length:celebrationEffect==="confetti"?48:28},(_,index)=><i key={index} style={{left:`${(index*37)%100}%`,background:`hsl(${index*47} 80% 55%)`,animationDelay:`${(index%7)*.08}s`}}/>)}</div>}
    <section className="relative z-10 w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
      <div className="mx-auto grid size-20 place-items-center rounded-full bg-amber-100 text-4xl" aria-hidden="true">🏆</div>
      <p className="mt-5 text-sm font-bold uppercase tracking-widest text-teal-700">{preview?"Test Mode preview":"Achievement unlocked"}</p>
      <h2 className="mt-2 text-3xl font-bold" id="achievement-title">{title}</h2>
      <p className="mt-3 leading-7 text-slate-600">{reason}</p>
      {celebrationEffect==="confetti"&&<p className="mt-2 text-xs font-semibold text-teal-700">Equipped Confetti celebration applied.</p>}
      {reducedMotion&&<p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">🎉 Celebration shown without animation because reduced motion is enabled.</p>}
      <button className="button mt-6" type="button" onClick={close}>Close</button>
    </section>
  </div>;
}

export function NewBadgeNotifications({awards}:{awards:{id:string;title:string;reason:string}[]}){
  const[index,setIndex]=useState(0);
  if(index>=awards.length)return null;
  const award=awards[index];
  return <AchievementCelebration title={award.title} reason={award.reason}
    awardIds={[award.id]} onClose={()=>setIndex(value=>value+1)}/>;
}
