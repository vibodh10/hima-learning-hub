"use client";

import {ChangeEvent, useState, useTransition} from "react";
import {saveSowAssessments} from "@/app/actions/sow-assessments";

type AssessmentDraft={id?:string;title:string;purpose:string;questions:string[]};
type GroupOption={id:string;name:string};

const ACCEPTED_EXTENSIONS=[".txt",".md",".csv",".json",".html",".htm"];

export function SowAssessmentGenerator({groups}:{groups:GroupOption[]}){
 const [sourceName,setSourceName]=useState("");
 const [sowText,setSowText]=useState("");
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [classId,setClassId]=useState("");
 const [assessments,setAssessments]=useState<AssessmentDraft[]>([]);
 const [pending,startTransition]=useTransition();

 async function handleFile(event:ChangeEvent<HTMLInputElement>){
  const file=event.target.files?.[0];setError("");setMessage("");
  if(!file)return;
  const lower=file.name.toLowerCase();
  if(!ACCEPTED_EXTENSIONS.some(extension=>lower.endsWith(extension))){
   setSourceName(file.name);setSowText("");
   setError("Please upload a text, CSV, Markdown, JSON or HTML version of the SOW. Word, Excel and PDF files need to be exported to one of these formats first.");
   return;
  }
  try{setSourceName(file.name);setSowText(cleanText(await file.text()));}
  catch{setSourceName(file.name);setSowText("");setError("This file could not be read. Please export the SOW as text or CSV and try again.");}
 }

 function generate(){
  const topics=extractTopics(sowText);
  if(!topics.length){setError("Add more SOW detail so the hub can identify teachable topics.");return;}
  setError("");setMessage("");setAssessments(buildAssessments(topics));
 }

 function updateQuestion(a:number,q:number,value:string){
  setAssessments(current=>current.map((assessment,index)=>index===a?{...assessment,questions:assessment.questions.map((question,questionIndex)=>questionIndex===q?value:question)}:assessment));
 }

 function save(publish:boolean){
  setError("");setMessage("");
  startTransition(async()=>{
   const result=await saveSowAssessments({
    classId:classId||null,sourceName:sourceName||"pasted SOW",publish,assessments
   });
   if(!result.ok){setError(result.message);return;}
   setMessage(result.message);
   setAssessments(current=>current.map((item,index)=>({...item,id:result.ids[index]})));
  });
 }

 return <section className="card border-2 border-purple-200 bg-purple-50/40">
  <div className="flex flex-wrap items-start justify-between gap-4">
   <div className="max-w-2xl">
    <p className="eyebrow">Start here</p>
    <h2 className="mt-2 text-2xl font-bold">Upload your Scheme of Work</h2>
    <p className="mt-2 text-sm leading-6 text-slate-700">Generate three formative checks, edit every question, save them as drafts, then publish them to a class when you are happy.</p>
   </div>
  </div>

  <div className="mt-5 grid gap-4 lg:grid-cols-2">
   <label className="grid gap-2 text-sm font-semibold">Upload SOW
    <input className="input" type="file" accept=".txt,.md,.csv,.json,.html,.htm,text/plain,text/csv,text/markdown,application/json,text/html" onChange={handleFile}/>
    <span className="text-xs font-normal text-slate-500">Accepted now: TXT, CSV, Markdown, JSON and HTML.</span>
   </label>
   <label className="grid gap-2 text-sm font-semibold">Or paste SOW content
    <textarea className="input min-h-36 resize-y" value={sowText} onChange={event=>{setSourceName("");setSowText(event.target.value);setMessage("");}} placeholder="Paste weeks, topics, learning aims, outcomes or lesson headings here..."/>
   </label>
  </div>

  <div className="mt-4 flex flex-wrap items-end gap-3">
   <button type="button" className="button-secondary" onClick={generate} disabled={!sowText.trim()}>Generate 3 assessments</button>
   {sourceName&&<span className="text-sm text-emerald-800">Loaded <strong>{sourceName}</strong></span>}
  </div>

  {error&&<p className="mt-4 rounded-xl bg-amber-100 p-3 text-sm text-amber-950" role="alert">{error}</p>}
  {message&&<p className="mt-4 rounded-xl bg-emerald-100 p-3 text-sm text-emerald-950" role="status">{message}</p>}

  {assessments.length>0&&<div className="mt-6">
   <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
    <label className="grid gap-1 text-sm font-semibold">Class for publishing
     <select className="input" value={classId} onChange={event=>setClassId(event.target.value)}>
      <option value="">Choose a class</option>
      {groups.map(group=><option key={group.id} value={group.id}>{group.name}</option>)}
     </select>
    </label>
    <button type="button" className="button-secondary" disabled={pending} onClick={()=>save(false)}>{pending?"Saving...":"Save drafts"}</button>
    <button type="button" className="button" disabled={pending||!classId} onClick={()=>save(true)}>{pending?"Publishing...":"Publish to class"}</button>
   </div>

   <div className="mt-5 grid gap-4">
    {assessments.map((assessment,index)=><article className="rounded-2xl border border-slate-200 bg-white p-5" key={index}>
     <div className="flex items-center gap-3"><span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-900">Check {index+1}</span>{assessment.id&&<span className="text-xs text-slate-500">Saved</span>}</div>
     <label className="mt-4 grid gap-1 text-sm font-semibold">Title
      <input className="input" value={assessment.title} onChange={event=>setAssessments(current=>current.map((item,i)=>i===index?{...item,title:event.target.value}:item))}/>
     </label>
     <label className="mt-3 grid gap-1 text-sm font-semibold">Purpose
      <textarea className="input min-h-20" value={assessment.purpose} onChange={event=>setAssessments(current=>current.map((item,i)=>i===index?{...item,purpose:event.target.value}:item))}/>
     </label>
     <div className="mt-4 grid gap-3">
      {assessment.questions.map((question,qIndex)=><label className="grid gap-1 text-sm font-semibold" key={qIndex}>Question {qIndex+1}
       <textarea className="input min-h-24" value={question} onChange={event=>updateQuestion(index,qIndex,event.target.value)}/>
      </label>)}
     </div>
    </article>)}
   </div>
   <p className="mt-4 text-xs leading-5 text-slate-500">Published SOW assessments are written-response checks. Students submit answers in the Hub and the tutor reviews them; they are not given a made-up automatic score.</p>
  </div>}
 </section>;
}

function buildAssessments(topics:string[]):AssessmentDraft[]{
 const selected=spreadTopics(topics,6);const topic=(index:number)=>selected[index%selected.length];
 return [
  {title:"Recall and understanding",purpose:"Use after the first part of the teaching sequence to identify gaps in core knowledge.",questions:[
   `Define or describe the main idea behind “${topic(0)}”.`,`Give two important facts, rules or features connected with “${topic(1)}”.`,`Explain the difference between “${topic(0)}” and “${topic(2)}”.`,`Give one correct example of “${topic(3)}”.`,`What common mistake could a learner make when working with “${topic(4)}”?`,`In one or two sentences, explain why “${topic(5)}” matters in this unit.`]},
  {title:"Application check",purpose:"Use midway through the SOW to check whether students can apply knowledge independently.",questions:[
   `Apply what you know about “${topic(0)}” to a new classroom or workplace scenario.`,`A learner has used “${topic(1)}” incorrectly. Identify the likely error and explain how to correct it.`,`Choose an appropriate method or approach for a task involving “${topic(2)}” and justify your choice.`,`Create a short worked example, plan, diagram or code fragment that demonstrates “${topic(3)}”.`,`What evidence would show that someone understands “${topic(4)}” rather than simply remembering it?`,`Connect “${topic(5)}” to another topic in this SOW and explain the relationship.`]},
  {title:"Exam-style reasoning",purpose:"Use towards the end of the SOW to practise explanation, analysis and justified conclusions.",questions:[
   `Explain how “${topic(0)}” could be used to solve a realistic problem. Include a clear chain of reasoning.`,`Compare two possible approaches to a task involving “${topic(1)}”. Which factors should be considered?`,`Analyse what could go wrong if “${topic(2)}” is misunderstood or implemented badly.`,`A student says that “${topic(3)}” is always the best approach. Give a balanced response using evidence or examples.`,`Evaluate the importance of “${topic(4)}” within the wider unit. Include strengths, limitations or consequences where relevant.`,`Write an exam-style conclusion about “${topic(5)}” that is supported by at least two reasons.`]}
 ];
}
function extractTopics(value:string){const lines=cleanText(value).split(/\r?\n/).map(line=>line.replace(/^[-*•\d.)\s]+/,"").trim()).filter(line=>line.length>=4&&line.length<=160).filter(line=>!/^(week|date|lesson|topic|learning objective|learning outcome|resources?|assessment|homework)\s*[:\-]?$/i.test(line));const unique=new Map<string,string>();for(const line of lines){const key=line.toLowerCase();if(!unique.has(key))unique.set(key,line);if(unique.size>=30)break;}return [...unique.values()];}
function spreadTopics(topics:string[],count:number){if(topics.length<=count)return topics;const result:string[]=[];for(let index=0;index<count;index++){result.push(topics[Math.round(index*(topics.length-1)/(count-1))]);}return result;}
function cleanText(value:string){return value.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\u0000/g,"").replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim();}
