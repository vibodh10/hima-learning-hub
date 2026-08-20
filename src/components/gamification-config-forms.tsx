"use client";

import { useActionState } from "react";
import {
  setCoinRules,
  updateBadgeDefinition,
  type ActionState,
} from "@/app/actions/learning";

export function BadgeDefinitionForm({
  badge,
}:{
  badge:{
    id:string;
    title:string;
    description:string;
    criteria:unknown;
    enabled:boolean;
  };
}){
  const[state,action,pending]=useActionState<ActionState,FormData>(updateBadgeDefinition,{});
  return <form action={action} className="rounded-xl border border-slate-200 p-4">
    <input type="hidden" name="badgeId" value={badge.id}/>
    <div className="flex items-center justify-between gap-3">
      <strong>{badge.title}</strong>
      <label className="flex items-center gap-2 text-xs font-semibold">
        <input type="checkbox" name="enabled" defaultChecked={badge.enabled}/>
        Enabled
      </label>
    </div>
    <label className="mt-3 grid gap-1 text-sm font-semibold">
      Learner-facing description
      <input className="input" name="description" defaultValue={badge.description} required/>
    </label>
    <label className="mt-3 grid gap-1 text-sm font-semibold">
      Server criteria (JSON)
      <textarea className="input min-h-20 font-mono text-xs" name="criteria" defaultValue={JSON.stringify(badge.criteria)} required/>
    </label>
    <button className="button-secondary mt-3" disabled={pending}>{pending?"Saving...":"Save badge criteria"}</button>
    {state.message&&<p className={`mt-2 text-sm ${state.ok?"text-teal-800":"text-red-700"}`}>{state.message}</p>}
  </form>;
}

export function CoinRulesForm({classId}:{classId:string}){
  const[state,action,pending]=useActionState<ActionState,FormData>(setCoinRules,{});
  return <form action={action} className="card mt-6 grid gap-4">
    <input type="hidden" name="classId" value={classId}/>
    <div>
      <p className="eyebrow">Secure rewards</p>
      <h2 className="mt-2 text-2xl font-bold">Class coin rules</h2>
      <p className="mt-2 text-sm text-slate-600">Awards are server-controlled, capped, and recorded with idempotency keys to prevent repeat farming.</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <CoinField name="requiredLearning" label="Required learning" value={5}/>
      <CoinField name="onTime" label="Homework on time" value={3}/>
      <CoinField name="improvement" label="Score improvement" value={5}/>
      <CoinField name="retrieval" label="Retrieval review" value={5}/>
      <CoinField name="mastery" label="Skill mastery" value={10}/>
      <CoinField name="optionalChallenge" label="Optional challenge" value={5}/>
    </div>
    <button className="button-secondary justify-self-start" disabled={pending}>{pending?"Saving...":"Save class coin rules"}</button>
    {state.message&&<p className={`text-sm ${state.ok?"text-teal-800":"text-red-700"}`}>{state.message}</p>}
  </form>;
}

function CoinField({name,label,value}:{name:string;label:string;value:number}){
  return <label className="grid gap-1 text-sm font-semibold">{label}<input className="input" type="number" min="0" max="100" name={name} defaultValue={value} required/></label>;
}

