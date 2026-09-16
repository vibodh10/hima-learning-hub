"use client";
import {useEffect,useRef,useState} from "react";
import {checkMiniStudy} from "@/app/actions/mini-study";
import {UntimedStudyPlayer,type PlayerProps} from "./mini-study-player";
import {startingPointRoute} from "@/lib/starting-point-route";
import type {StudyGrade,StudyResponse} from "@/lib/mini-study";
type Saved={index:number;answers:Record<string,string>;deadline:number};
export function TimedStartingPoint({card,check=checkMiniStudy,finish}:PlayerProps){
 const [run,setRun]=useState<Saved|null>(null);const [seconds,setSeconds]=useState(5);const [extra,setExtra]=useState(false);
 const [grade,setGrade]=useState<StudyGrade|null>(null);const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 const current=useRef(run);current.current=run;const saving=useRef(false);const storageKey=`starting-point:${card.sessionId}`;
 useEffect(()=>{try{const saved=sessionStorage.getItem(storageKey);if(saved)setRun(JSON.parse(saved));}catch{}},[storageKey]);
 function persist(next:Saved){current.current=next;setRun(next);try{sessionStorage.setItem(storageKey,JSON.stringify(next));}catch{}}
 async function submit(saved:Saved){if(saving.current)return;saving.current=true;setBusy(true);setError("");try{const result=await check(card.sessionId,card.questions.map(q=>({questionId:q.id,answer:saved.answers[q.id]})) as StudyResponse[]);if(result.ok){setGrade(result.grade);try{sessionStorage.removeItem(storageKey);}catch{}}else setError(result.message);}catch{setError("Your answers are kept here. Please retry saving.");}finally{saving.current=false;setBusy(false);}}
 useEffect(()=>{
  if(!run||grade||run.index>=card.questions.length)return;
  const tick=()=>{const saved=current.current;if(!saved)return;const remaining=Math.max(0,Math.ceil((saved.deadline-Date.now())/1000));setSeconds(remaining);if(remaining>0)return;
   const q=card.questions[saved.index];if(!q)return;const timeout=q.options.find(o=>o.text.startsWith("Time expired"))!;
   const next={index:saved.index+1,answers:{...saved.answers,[q.id]:saved.answers[q.id]??timeout.id},deadline:Date.now()+(extra?20:5)*1000};persist(next);
  };tick();const timer=setInterval(tick,100);return()=>clearInterval(timer);
 },[run?.index,Boolean(run),grade,extra]);
 useEffect(()=>{if(run&&run.index>=card.questions.length&&!grade&&!error)void submit(run);},[run?.index,grade,error]);
 if(grade)return <><p className="mini-study-panel">{startingPointRoute(grade)}. This is a starting suggestion, not a fixed ability label.</p><UntimedStudyPlayer card={card} initialGrade={grade} finish={finish}/></>;
 if(!run)return <section className="mini-study-panel"><h1>Your 10-question starting point</h1><p>Basic IT skills, one question at a time. You have five seconds to choose an answer; the next question opens automatically. Use your own knowledge.</p><p>A timeout means your teacher should check again. It does not prove you lack the skill.</p><label><input type="checkbox" checked={extra} onChange={e=>setExtra(e.target.checked)}/> I need extra reading time (20 seconds per question)</label><button className="mini-study-primary" onClick={()=>persist({index:0,answers:{},deadline:Date.now()+(extra?20:5)*1000})}>Start timed check</button></section>;
 const q=card.questions[run.index];
 return <section className="mini-study-panel">{q?<><p>Question {run.index+1} of 10 · <strong role="timer">{seconds} seconds</strong></p><h1>{q.prompt}</h1><fieldset className="mini-study-options"><legend className="sr-only">Choose one answer</legend>{q.options.filter(o=>!o.text.startsWith("Time expired")).map(o=><label className="mini-study-option" key={o.id}><input type="radio" name={q.id} checked={run.answers[q.id]===o.id} onChange={()=>{if(Date.now()<run.deadline)persist({...run,answers:{...run.answers,[q.id]:o.id}});}}/>{o.text}</label>)}</fieldset></>:<p>{busy?"Saving your starting point…":"Check finished."}</p>}{error&&<><p role="alert">{error}</p><button className="mini-study-primary" disabled={busy} onClick={()=>submit(run)}>Retry saving</button></>}</section>;
}
