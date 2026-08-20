"use client";

import { useActionState } from "react";
import {
  overrideActivityLock,reconcileRewardPurchases,type ActionState,
} from "@/app/actions/learning";

export function RewardReconciliationForm(){
  const[state,action,pending]=useActionState<ActionState,FormData>(reconcileRewardPurchases,{});
  return <form action={action} className="mt-4">
    <button className="button-secondary" disabled={pending}>{pending?"Checking…":"Check and refund incomplete purchases"}</button>
    {state.message&&<p className={`mt-3 text-sm ${state.ok?"text-teal-800":"text-red-700"}`} role="status">{state.message}</p>}
  </form>;
}

export function ActivityLockOverrideForm({learnerId,activities}:{learnerId:string;activities:{id:string;title:string}[]}){
  const[state,action,pending]=useActionState<ActionState,FormData>(overrideActivityLock,{});
  return <form action={action} className="mt-4 grid gap-3">
    <input type="hidden" name="learnerId" value={learnerId}/>
    <label className="text-sm font-semibold">Activity<select className="input mt-1" name="activityId" required><option value="">Choose an activity</option>{activities.map(activity=><option key={activity.id} value={activity.id}>{activity.title}</option>)}</select></label>
    <label className="text-sm font-semibold">Educational or testing reason<input className="input mt-1" name="reason" minLength={5} maxLength={500} required/></label>
    <button className="button-secondary justify-self-start" disabled={pending}>{pending?"Recording…":"Override activity lock"}</button>
    {state.message&&<p className={`text-sm ${state.ok?"text-teal-800":"text-red-700"}`} role="status">{state.message}</p>}
  </form>;
}
