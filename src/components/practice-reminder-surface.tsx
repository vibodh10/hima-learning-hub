"use client";
import {useEffect,useState,type ReactNode} from "react";
export function PracticeReminderSurface({due,children}:{due:boolean;children:ReactNode}){
 const [cleared,setCleared]=useState(false);
 useEffect(()=>{const completed=()=>setCleared(true);window.addEventListener("required-practice-completed",completed);return()=>window.removeEventListener("required-practice-completed",completed);},[]);
 const active=due&&!cleared;
 return <div className={`mini-study-surface${active?" practice-overdue":""}`}>{active&&<div className="mx-auto max-w-2xl rounded-xl border-2 border-red-700 bg-white p-4 text-red-950" role="alert"><strong>Required practice to complete</strong><p>Complete your required next practice or assessment and review its feedback. This red background clears after one completed practice. The assignment guide is optional.</p></div>}{children}</div>;
}
