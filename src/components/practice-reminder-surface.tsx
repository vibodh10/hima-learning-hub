"use client";
import {useEffect,useState,type ReactNode} from "react";
export function PracticeReminderSurface({due,children}:{due:boolean;children:ReactNode}){
 const [cleared,setCleared]=useState(false);
 useEffect(()=>{const completed=()=>setCleared(true);window.addEventListener("required-practice-completed",completed);return()=>window.removeEventListener("required-practice-completed",completed);},[]);
 const active=due&&!cleared;
 return <div className={`mini-study-surface${active?" practice-overdue":""}`}>{active&&<div className="mx-auto max-w-2xl rounded-xl border-2 border-red-700 bg-white p-4 text-red-950" role="alert"><strong>Your practice is overdue</strong><p>No short lesson is recorded since your last scheduled teaching day. Complete one short lesson and review its feedback to clear this reminder. The optional assignment guide does not count.</p></div>}{children}</div>;
}
