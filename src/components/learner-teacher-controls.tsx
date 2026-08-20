"use client";

import { useActionState } from "react";
import {
  adjustCoins, bulkApproveTargets, createProgressSnapshot, createTeacherTarget, overridePathway, recordTeacherAction,
  reviewFormativeResponse,
  updateTarget, type ActionState,
} from "@/app/actions/learning";
import { recordWorkbookTeacherDecision, type CurriculumActionState } from "@/app/actions/curriculum";

export function TargetReviewForm({ target }: { target: { id: string; target_text: string; status: string; teacher_note: string | null } }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateTarget, {});
  return <form action={action} className="mt-3 grid gap-3">
    <input type="hidden" name="targetId" value={target.id}/>
    <label className="grid gap-1 text-sm font-semibold">Target text<textarea className="input min-h-20" name="targetText" defaultValue={target.target_text} required/></label>
    <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-semibold">Status<select className="input" name="status" defaultValue={target.status}>{["proposed","approved","active","achieved","partially_achieved","not_achieved","extended","replaced","archived"].map(value => <option key={value} value={value}>{value.replaceAll("_"," ")}</option>)}</select></label><label className="grid gap-1 text-sm font-semibold">Teacher note<input className="input" name="teacherNote" defaultValue={target.teacher_note ?? ""}/></label></div>
    <button className="button-secondary justify-self-start" disabled={pending}>{pending ? "Saving…" : "Save target review"}</button>
    <Feedback state={state}/>
  </form>;
}

export function CoinCorrectionForm({ learnerId }: { learnerId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(adjustCoins, {});
  return <form action={action} className="mt-4 grid gap-3">
    <input type="hidden" name="learnerId" value={learnerId}/>
    <div className="grid gap-3 sm:grid-cols-[9rem_1fr]"><label className="grid gap-1 text-sm font-semibold">Coin adjustment<input className="input" name="amount" type="number" min="-500" max="500" placeholder="+10 or -10" required/></label><label className="grid gap-1 text-sm font-semibold">Audit reason<input className="input" name="note" placeholder="Reason for this correction" required/></label></div>
    <button className="button-secondary justify-self-start" disabled={pending}>{pending ? "Recording…" : "Record correction"}</button>
    <Feedback state={state}/>
  </form>;
}

export function TeacherActionForm({ learnerId, classId }: { learnerId: string; classId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(recordTeacherAction, {});
  const actions=["result reviewed","additional practice allocated","pathway changed","explanation provided","support arranged","target created","target extended","deadline extended","progress discussed","topic fast-tracked","student returned to earlier content","no action required","custom action"];
  return <form action={action} className="mt-4 grid gap-3">
    <input type="hidden" name="learnerId" value={learnerId}/><input type="hidden" name="classId" value={classId}/>
    <div className="grid gap-3 md:grid-cols-2"><label className="grid gap-1 text-sm font-semibold">Action<select className="input" name="action">{actions.map(value=><option key={value}>{value}</option>)}</select></label><label className="grid gap-1 text-sm font-semibold">Review date<input className="input" name="reviewOn" type="date"/></label></div>
    <label className="grid gap-1 text-sm font-semibold">Evidence-based reason<textarea className="input min-h-20" name="reason" required/></label>
    <label className="grid gap-1 text-sm font-semibold">Outcome, if already known<textarea className="input min-h-16" name="outcome"/></label>
    <button className="button-secondary justify-self-start" disabled={pending}>{pending?"Recording…":"Record teacher action"}</button><Feedback state={state}/>
  </form>;
}

export function PathwayOverrideForm({ learnerId, skills }: { learnerId: string; skills: { skill_id: string; title: string; pathway: string }[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(overridePathway, {});
  return <form action={action} className="mt-4 grid gap-3">
    <input type="hidden" name="learnerId" value={learnerId}/>
    <div className="grid gap-3 md:grid-cols-2"><label className="grid gap-1 text-sm font-semibold">Skill<select className="input" name="skillId">{skills.map(skill=><option value={skill.skill_id} key={skill.skill_id}>{skill.title} · currently {skill.pathway}</option>)}</select></label><label className="grid gap-1 text-sm font-semibold">New pathway<select className="input" name="newPathway">{["Support","Core","Stretch","Mastery"].map(value=><option key={value}>{value}</option>)}</select></label></div>
    <div className="grid gap-3 md:grid-cols-[1fr_12rem]"><label className="grid gap-1 text-sm font-semibold">Reason<input className="input" name="reason" required/></label><label className="grid gap-1 text-sm font-semibold">Review date<input className="input" name="reviewOn" type="date" required/></label></div>
    <button className="button-secondary justify-self-start" disabled={pending||!skills.length}>{pending?"Saving…":"Record pathway override"}</button><Feedback state={state}/>
  </form>;
}

export function SnapshotForm({ learnerId, classId, periods }: { learnerId: string; classId: string; periods: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createProgressSnapshot, {});
  return <form action={action} className="mt-4 grid gap-3">
    <input type="hidden" name="learnerId" value={learnerId}/><input type="hidden" name="classId" value={classId}/>
    <label className="grid gap-1 text-sm font-semibold">Term or semester<select className="input" name="academicPeriodId">{periods.map(period=><option value={period.id} key={period.id}>{period.name}</option>)}</select></label>
    <label className="grid gap-1 text-sm font-semibold">Learner reflection, if provided<textarea className="input min-h-16" name="reflection"/></label>
    <label className="grid gap-1 text-sm font-semibold">Next-term priorities<textarea className="input min-h-20" name="nextPriorities" required/></label>
    <button className="button-secondary justify-self-start" disabled={pending||!periods.length}>{pending?"Creating…":"Create permanent snapshot"}</button><Feedback state={state}/>
  </form>;
}

export function CreateTargetForm({learnerId,classId,skills}:{learnerId:string;classId:string;skills:{id:string;title:string}[]}){
  const[state,action,pending]=useActionState<ActionState,FormData>(createTeacherTarget,{});
  return <form action={action} className="mt-4 grid gap-3"><input type="hidden" name="learnerId" value={learnerId}/><input type="hidden" name="classId" value={classId}/><div className="grid gap-3 md:grid-cols-2"><label className="grid gap-1 text-sm font-semibold">Target level<select className="input" name="level">{[["weekly","Weekly"],["topic","Topic"],["unit","Unit"],["term_semester","Term / Semester"]].map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><label className="grid gap-1 text-sm font-semibold">Related skill<select className="input" name="skillId"><option value="">No single skill</option>{skills.map(skill=><option value={skill.id} key={skill.id}>{skill.title}</option>)}</select></label></div><label className="grid gap-1 text-sm font-semibold">Measurable target<textarea className="input min-h-20" name="targetText" placeholder="Complete the Python selection Core practice and achieve at least 70% in an equivalent-question review." required/></label><label className="grid gap-1 text-sm font-semibold">Reason from evidence<input className="input" name="reason" required/></label><label className="grid gap-1 text-sm font-semibold">Expected success measure<input className="input" name="successMeasure" placeholder="At least 70% on an equivalent review without hints" required/></label><div className="grid gap-3 sm:grid-cols-3"><label className="grid gap-1 text-sm font-semibold">Starts<input className="input" type="date" name="startsOn" required/></label><label className="grid gap-1 text-sm font-semibold">Deadline<input className="input" type="date" name="deadline" required/></label><label className="grid gap-1 text-sm font-semibold">Review<input className="input" type="date" name="reviewOn" required/></label></div><label className="grid gap-1 text-sm font-semibold">Teacher note<input className="input" name="teacherNote"/></label><button className="button-secondary justify-self-start" disabled={pending}>{pending?"Creating…":"Create approved target"}</button><Feedback state={state}/></form>;
}

export function FormativeResponseReviewForm({review,learnerId}:{review:{id:string;answer:string;question:string;maxMark:number};learnerId:string}){
  const[state,action,pending]=useActionState<ActionState,FormData>(reviewFormativeResponse,{});
  return <form action={action} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
    <input type="hidden" name="reviewId" value={review.id}/><input type="hidden" name="learnerId" value={learnerId}/><input type="hidden" name="maxMark" value={review.maxMark}/>
    <p className="font-semibold">{review.question}</p>
    <blockquote className="mt-3 rounded-lg bg-white p-3 text-sm">{review.answer}</blockquote>
    <div className="mt-3 grid gap-3 sm:grid-cols-[8rem_1fr]"><label className="grid gap-1 text-sm font-semibold">Mark / {review.maxMark}<input className="input bg-white" name="mark" type="number" min="0" max={review.maxMark} step="0.5" required/></label><label className="grid gap-1 text-sm font-semibold">Formative feedback<textarea className="input min-h-20 bg-white" name="feedback" required/></label></div>
    <label className="mt-3 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="returnForPractice"/>Return for further practice</label>
    <button className="button-secondary mt-3" disabled={pending}>{pending?"Saving...":"Save formative review"}</button><Feedback state={state}/>
  </form>;
}

export function BulkApproveTargetsForm({learnerId,targetIds}:{learnerId:string;targetIds:string[]}){
  const[state,action,pending]=useActionState<ActionState,FormData>(bulkApproveTargets,{});
  if(!targetIds.length)return null;
  return <form action={action} className="mt-4 flex flex-wrap items-center gap-3"><input type="hidden" name="learnerId" value={learnerId}/>{targetIds.map(id=><input type="hidden" name="targetIds" value={id} key={id}/>)}<button className="button-secondary" disabled={pending}>{pending?"Approving...":`Approve all ${targetIds.length} proposed targets`}</button><Feedback state={state}/></form>;
}

export function WorkbookDecisionForm({ learnerId, units }: { learnerId: string; units: { code: string; title: string; topics: { code: string; title: string }[] }[] }) {
  const [state, action, pending] = useActionState<CurriculumActionState, FormData>(recordWorkbookTeacherDecision, {});
  return <form action={action} className="mt-4 grid gap-3"><input type="hidden" name="learnerId" value={learnerId}/><div className="grid gap-3 md:grid-cols-3"><label className="grid gap-1 text-sm font-semibold">Decision<select className="input" name="decisionType">{[["assign_topic","Assign topic"],["assign_mastery_check","Assign mastery check"],["assign_progress_point","Assign progress point"],["route_override","Override route"],["project_unlock","Exceptional project unlock"],["feedback","Add feedback"],["intervention","Record intervention"],["reflection_review","Review reflection"]].map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><label className="grid gap-1 text-sm font-semibold">Unit<select className="input" name="unitCode">{units.map(unit=><option value={unit.code} key={unit.code}>Unit {unit.code}: {unit.title}</option>)}</select></label><label className="grid gap-1 text-sm font-semibold">Topic (if applicable)<select className="input" name="topicCode"><option value="">Whole unit / project</option>{units.flatMap(unit=>unit.topics.map(topic=><option value={topic.code} key={`${unit.code}-${topic.code}`}>Unit {unit.code} · {topic.code} {topic.title}</option>))}</select></label></div><div className="grid gap-3 md:grid-cols-3"><label className="grid gap-1 text-sm font-semibold">Original route<input className="input" name="originalRoute" placeholder="Required for overrides"/></label><label className="grid gap-1 text-sm font-semibold">New route<input className="input" name="newRoute" placeholder="Required for overrides"/></label><label className="grid gap-1 text-sm font-semibold">Review date<input className="input" name="reviewOn" type="date"/></label></div><label className="grid gap-1 text-sm font-semibold">Documented educational reason<textarea className="input min-h-20" name="reason" required placeholder="Refer to the evidence and explain why this action is appropriate."/></label><p className="text-xs text-slate-500">A project unlock permits access only. It does not award topic mastery, complete mandatory evidence or assess the project.</p><button className="button-secondary justify-self-start" disabled={pending}>{pending ? "Recording…" : "Record workbook decision"}</button>{state.message && <p className={`text-sm ${state.ok ? "text-teal-800" : "text-red-700"}`} role="status">{state.message}</p>}</form>;
}

function Feedback({ state }: { state: ActionState }) { return state.message ? <p className={`text-sm ${state.ok ? "text-teal-800" : "text-red-700"}`} role="status">{state.message}</p> : null; }
