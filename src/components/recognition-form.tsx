"use client";

import {useActionState} from "react";
import {recogniseLearner,type ActionState} from "@/app/actions/learning";

export function RecognitionForm({learnerId,classId,templates}:{learnerId:string;classId:string;templates:{id:string;title:string;category:string}[]}){
  const[state,action,pending]=useActionState<ActionState,FormData>(recogniseLearner,{});
  return <form action={action} className="card mt-6"><input type="hidden" name="learnerId" value={learnerId}/><input type="hidden" name="classId" value={classId}/><p className="eyebrow">You&apos;ve been noticed</p><h2 className="mt-2 text-2xl font-bold">Quick professional recognition</h2><p className="mt-2 text-sm text-slate-600">Choose a predefined, college-appropriate message when your professional judgement is required. This does not change marks.</p><div className="mt-4 flex flex-wrap items-end gap-3"><label className="grid min-w-72 flex-1 gap-1 text-sm font-semibold">Recognition<select className="input" name="templateId" required defaultValue=""><option value="" disabled>Select a template</option>{templates.map(template=><option value={template.id} key={template.id}>{template.title} · {template.category.replaceAll("_"," ")}</option>)}</select></label><button className="button-secondary" disabled={pending}>{pending?"Recording…":"Recognise learner"}</button></div>{state.message&&<p role="status" className={`mt-3 text-sm ${state.ok?"text-teal-800":"text-red-700"}`}>{state.message}</p>}</form>;
}
