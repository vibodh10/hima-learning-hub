"use client";

import {useActionState} from "react";
import {
  reviewCertificateEligibility,updateAchievementLevel,updateAchievementRule,updateRecognitionTemplate,type ActionState,
} from "@/app/actions/learning";

export function AchievementRuleForm({rule}:{rule:{id:string;title:string;points:number;enabled:boolean}}){
  const[state,action,pending]=useActionState<ActionState,FormData>(updateAchievementRule,{});
  return <form action={action} className="rounded-xl border border-slate-200 p-4"><input type="hidden" name="ruleId" value={rule.id}/><div className="flex flex-wrap items-center justify-between gap-3"><strong>{rule.title}</strong><label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" name="enabled" defaultChecked={rule.enabled}/>Enabled</label></div><label className="mt-3 grid gap-1 text-sm font-semibold">Achievement Points<input className="input" type="number" name="points" min="0" max="100" defaultValue={rule.points} required/></label><button className="button-secondary button-small mt-3" disabled={pending}>{pending?"Saving…":"Save AP rule"}</button>{state.message&&<Status state={state}/>}</form>;
}

export function AchievementLevelForm({level}:{level:{id:string;title:string;threshold:number;certificate_eligible:boolean;enabled:boolean}}){
  const[state,action,pending]=useActionState<ActionState,FormData>(updateAchievementLevel,{});
  return <form action={action} className="rounded-xl border border-slate-200 p-4"><input type="hidden" name="levelId" value={level.id}/><strong>{level.title}</strong><label className="mt-3 grid gap-1 text-sm font-semibold">AP threshold<input className="input" type="number" name="threshold" min="0" max="100000" defaultValue={level.threshold} required/></label><div className="mt-3 flex flex-wrap gap-5 text-xs font-semibold"><label className="flex items-center gap-2"><input type="checkbox" name="enabled" defaultChecked={level.enabled}/>Enabled</label><label className="flex items-center gap-2"><input type="checkbox" name="certificateEligible" defaultChecked={level.certificate_eligible}/>Certificate eligible for staff review</label></div><button className="button-secondary button-small mt-3" disabled={pending}>{pending?"Saving…":"Save level"}</button>{state.message&&<Status state={state}/>}</form>;
}

export function RecognitionTemplateForm({template}:{template:{id:string;title:string;category:string;message:string;enabled:boolean}}){
  const[state,action,pending]=useActionState<ActionState,FormData>(updateRecognitionTemplate,{});
  return <form action={action} className="rounded-xl border border-slate-200 p-4"><input type="hidden" name="templateId" value={template.id}/><div className="flex flex-wrap items-center justify-between gap-3"><div><strong>{template.title}</strong><p className="text-xs capitalize text-slate-500">{template.category.replaceAll("_"," ")}</p></div><label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" name="enabled" defaultChecked={template.enabled}/>Enabled</label></div><label className="mt-3 grid gap-1 text-sm font-semibold">Learner-facing message<textarea className="input min-h-24" name="message" defaultValue={template.message} minLength={10} maxLength={500} required/></label><button className="button-secondary button-small mt-3" disabled={pending}>{pending?"Saving…":"Save recognition"}</button>{state.message&&<Status state={state}/>}</form>;
}

export function CertificateEligibilityReviewForm({review}:{review:{id:string;learnerName:string;levelTitle:string;eligibleAt:string}}){
  const[state,action,pending]=useActionState<ActionState,FormData>(reviewCertificateEligibility,{});
  return <form action={action} className="rounded-xl border border-slate-200 p-4"><input type="hidden" name="reviewId" value={review.id}/><div className="flex flex-wrap items-start justify-between gap-3"><div><strong>{review.learnerName}</strong><p className="mt-1 text-xs text-slate-500">{review.levelTitle} eligibility · {new Date(review.eligibleAt).toLocaleDateString("en-GB")}</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-950">Pending staff review</span></div><label className="mt-4 grid gap-1 text-sm font-semibold">Decision<select className="input" name="status" defaultValue="confirmed"><option value="confirmed">Eligibility confirmed</option><option value="declined">Eligibility declined</option></select></label><label className="mt-3 grid gap-1 text-sm font-semibold">Evidence review note<textarea className="input min-h-24" name="note" minLength={5} maxLength={1000} required/></label><p className="mt-2 text-xs text-slate-500">This records an authorised eligibility decision only. It does not issue or promise a college certificate.</p><button className="button-secondary button-small mt-3" disabled={pending}>{pending?"Recording…":"Record eligibility review"}</button>{state.message&&<Status state={state}/>}</form>;
}

function Status({state}:{state:ActionState}){return <p role="status" className={`mt-2 text-sm ${state.ok?"text-teal-800":"text-red-700"}`}>{state.message}</p>}
